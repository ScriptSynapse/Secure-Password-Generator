import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { PasswordOptions } from '../types/password';
import { buildImportCsv, detectBrowser, normalizeSite, IMPORT_LIMIT, type BrowserId, type LoginEntry } from '../lib/browserExport';
import { generatePassword } from '../lib/generator';
import { copyText } from '../hooks/useClipboard';
import { useAnnounce } from '../hooks/useAnnouncer';
import { IconAlert, IconArrowRight, IconCheck, IconDevice, IconDownload, IconEye, IconEyeOff, IconInfo, IconPlus, IconRefresh, IconTrash } from './Icons';

export type NewLogin = Omit<LoginEntry, 'id'>;

const BROWSERS: { id: BrowserId; label: string; importSteps: string[]; sync: string }[] = [
  {
    id: 'chrome',
    label: 'Chrome',
    importSteps: ['Open the ⋮ menu → Passwords and autofill → Password Manager.', 'Open Settings, then under “Import passwords” choose Select file.', 'Pick the VaultKey .csv and follow the prompts.'],
    sync: 'Sign in to Chrome on each device and turn on sync for Passwords. Saved passwords then appear in Chrome everywhere you’re signed in.',
  },
  {
    id: 'edge',
    label: 'Edge',
    importSteps: ['Click your profile button → Passwords (key icon).', 'Open ⋯ More actions → Import passwords.', 'Choose “Passwords CSV file”, then Choose file and pick the VaultKey .csv.'],
    sync: 'Sign in to Edge with your Microsoft account and turn on sync for Passwords (Settings → Profiles → Sync).',
  },
  {
    id: 'firefox',
    label: 'Firefox',
    importSteps: ['Open the ☰ menu → Passwords.', 'Click ⋯ → Import from a File…', 'Pick the VaultKey .csv, click Open, then Done.'],
    sync: 'Sign in with your Mozilla account on each device and make sure Passwords is ticked in Settings → Sync.',
  },
  {
    id: 'safari',
    label: 'Safari / Apple',
    importSteps: ['Open the Passwords app on your Mac.', 'Choose File → Import Passwords from File.', 'Click Choose File, pick the VaultKey .csv, then Import.'],
    sync: 'Turn on Passwords (iCloud Keychain) in iCloud settings on each Apple device — Mac, iPhone and iPad share the same passwords.',
  },
];

interface FieldsProps {
  idBase: string;
  site: string;
  setSite: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  note?: string;
  setNote?: (v: string) => void;
  siteError: string | null;
}

function LoginFields({ idBase, site, setSite, username, setUsername, note, setNote, siteError }: FieldsProps) {
  return (
    <>
      <div>
        <label htmlFor={`${idBase}-site`} className="text-sm font-medium">
          Website <span className="text-subtle">(required)</span>
        </label>
        <input
          id={`${idBase}-site`}
          className="input mt-1 !font-sans"
          placeholder="e.g. github.com/signup"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={!!siteError}
          aria-describedby={siteError ? `${idBase}-site-err` : undefined}
          data-testid="save-site"
        />
        {siteError && (
          <p id={`${idBase}-site-err`} className="mt-1 text-sm text-warn">
            {siteError}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${idBase}-user`} className="text-sm font-medium">
          Username or email <span className="text-subtle">(optional)</span>
        </label>
        <input
          id={`${idBase}-user`}
          className="input mt-1 !font-sans"
          placeholder="you@example.com"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={320}
          data-testid="save-username"
        />
      </div>
      {setNote && (
        <div>
          <label htmlFor={`${idBase}-note`} className="text-sm font-medium">
            Note <span className="text-subtle">(optional)</span>
          </label>
          <input id={`${idBase}-note`} className="input mt-1 !font-sans" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" maxLength={500} data-testid="save-note" />
        </div>
      )}
    </>
  );
}

/** What to do in the site's tab once it's open. */
function NextSteps() {
  return (
    <ol className="space-y-2 text-sm text-muted" data-testid="save-next-steps">
      {[
        'In the new tab, go to the sign-up or “change password” form.',
        'Paste the password (Ctrl+V / ⌘V) and submit the form.',
        'When your browser asks “Save password?”, click Save. Next time you log in there, it fills in automatically.',
      ].map((t, i) => (
        <li key={t} className="flex gap-2.5">
          <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-primary/15 font-mono text-xs text-primary">{i + 1}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Copy the password, open the site, and (optionally) keep the login for the transfer file.
 * Returns false if the site address is invalid.
 */
async function copyAndOpen(password: string, url: string) {
  const copied = await copyText(password);
  window.open(url, '_blank', 'noopener,noreferrer');
  return copied;
}

/** Modal opened from the Password, Passphrase and Bulk tabs. */
export function SaveToBrowserDialog({ password, onClose, onAdd }: { password: string | null; onClose: () => void; onAdd: (e: NewLogin) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const idBase = useId();
  const announce = useAnnounce();
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [keep, setKeep] = useState(true);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [opened, setOpened] = useState<null | { copied: boolean }>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (password && !d.open) {
      setSite('');
      setUsername('');
      setSiteError(null);
      setOpened(null);
      d.showModal();
    } else if (!password && d.open) d.close();
  }, [password]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    const r = normalizeSite(site);
    if (!r.ok) {
      setSiteError(r.error);
      return;
    }
    if (keep) onAdd({ name: r.name, url: r.url, username: username.trim(), password, note: '' });
    const copied = await copyAndOpen(password, r.url);
    setOpened({ copied });
    announce(copied ? `Password copied. ${r.name} opened in a new tab.` : `${r.name} opened in a new tab. Copy the password manually.`);
  };

  return (
    <dialog ref={ref} className="vk-dialog" aria-labelledby={`${idBase}-t`} onClose={onClose} data-testid="save-dialog">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <IconDevice size={20} />
          </span>
          <div>
            <h2 id={`${idBase}-t`} className="text-lg font-semibold">
              Save in your browser
            </h2>
            <p className="text-sm text-muted">Your browser saves passwords when you use them on the website itself.</p>
          </div>
        </div>

        {!opened ? (
          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            <LoginFields {...{ idBase, site, setSite: (v: string) => (setSite(v), setSiteError(null)), username, setUsername, siteError }} />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-black/20 p-3">
              <input type="checkbox" className="check mt-0.5" checked={keep} onChange={(e) => setKeep(e.target.checked)} data-testid="save-keep" />
              <span className="text-sm">
                <span className="font-medium text-ink">Also add to my transfer list</span>
                <span className="block text-muted">So you can import it into other browsers later (Save tab).</span>
              </span>
            </label>
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" data-testid="save-copy-open">
                Copy password &amp; open site
                <IconArrowRight size={18} />
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <p className={`flex items-center gap-2 text-sm font-medium ${opened.copied ? 'text-primary' : 'text-warn'}`} role="status">
              {opened.copied ? <IconCheck size={16} /> : <IconAlert size={16} />}
              {opened.copied ? 'Password copied — the site opened in a new tab.' : 'The site opened, but copying was blocked. Copy the password from VaultKey first.'}
            </p>
            <NextSteps />
            <div className="flex justify-end pt-1">
              <button type="button" className="btn btn-primary" onClick={onClose} data-testid="save-done">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

/** Trigger shown under each generated password. */
export function SaveToBrowserButton({ onClick, disabled, compact = false }: { onClick: () => void; disabled?: boolean; compact?: boolean }) {
  if (compact) {
    return (
      <button type="button" className="icon-btn !h-10 !w-10" onClick={onClick} disabled={disabled} aria-label="Save in your browser" title="Save in your browser">
        <IconDevice size={16} />
      </button>
    );
  }
  return (
    <button type="button" className="btn btn-ghost w-full" onClick={onClick} disabled={disabled} data-testid="save-to-browser">
      <IconDevice size={18} />
      Save in your browser
    </button>
  );
}

interface PanelProps {
  entries: LoginEntry[];
  onAdd: (e: NewLogin) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  options: PasswordOptions;
}

/** The "Save" tab. */
export function SavePanel({ entries, onAdd, onRemove, onClear, options }: PanelProps) {
  const announce = useAnnounce();
  const idBase = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [siteError, setSiteError] = useState<string | null>(null);
  const [masked, setMasked] = useState(true);
  const [justOpened, setJustOpened] = useState<string | null>(null);
  const [browser, setBrowser] = useState<BrowserId>(() => detectBrowser(navigator.userAgent));
  const fresh = () => {
    try {
      return generatePassword(options).value;
    } catch {
      return '';
    }
  };
  const [password, setPassword] = useState(fresh);

  const validate = () => {
    const r = normalizeSite(site);
    if (!r.ok) setSiteError(r.error);
    else if (entries.length >= IMPORT_LIMIT) {
      setSiteError(`A transfer file can hold up to ${IMPORT_LIMIT} logins. Download this list first.`);
      return null;
    }
    return r.ok ? r : null;
  };
  const reset = () => {
    setSite('');
    setUsername('');
    setNote('');
    setPassword(fresh());
  };

  const addOnly = (e: FormEvent) => {
    e.preventDefault();
    const r = validate();
    if (!r || !password) return;
    onAdd({ name: r.name, url: r.url, username: username.trim(), password, note: note.trim() });
    setJustOpened(null);
    reset();
  };

  const addAndOpen = async () => {
    const r = validate();
    if (!r || !password) return;
    onAdd({ name: r.name, url: r.url, username: username.trim(), password, note: note.trim() });
    const copied = await copyAndOpen(password, r.url);
    setJustOpened(r.name);
    announce(copied ? `Password copied. ${r.name} opened in a new tab.` : `${r.name} opened. Copying was blocked.`);
    reset();
  };

  const download = () => {
    const csv = buildImportCsv(entries);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaultkey-passwords.csv';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    dialogRef.current?.close();
    announce('Transfer file downloaded');
  };

  const current = BROWSERS.find((b) => b.id === browser) ?? BROWSERS[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
      <div className="space-y-4">
        <section className="card p-4 sm:p-6" aria-labelledby={`${idBase}-h`}>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-primary/15 text-primary">
              <IconDevice size={22} />
            </span>
            <div>
              <h2 id={`${idBase}-h`} className="text-lg font-semibold">
                Save in your browser
              </h2>
              <p className="mt-1 text-sm text-muted">
                Your browser saves a password when you use it on the website, then fills it in next time you log in. VaultKey copies the password and opens the site for
                you — just paste, submit, and click <strong className="text-ink">Save</strong> when your browser asks.
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={addOnly} noValidate>
            <LoginFields {...{ idBase, site, setSite: (v: string) => (setSite(v), setSiteError(null)), username, setUsername, note, setNote, siteError }} />
            <div>
              <span className="text-sm font-medium" id={`${idBase}-pw`}>
                Password <span className="text-subtle">(generated with your current Password settings)</span>
              </span>
              <div className="mt-1 flex items-center gap-2">
                <code className="input flex min-w-0 items-center break-all text-ink" aria-labelledby={`${idBase}-pw`} data-testid="save-password">
                  {masked ? '•'.repeat(password.length) : password}
                </code>
                <button type="button" className="icon-btn" onClick={() => setMasked((m) => !m)} aria-pressed={masked} aria-label={masked ? 'Show password' : 'Hide password'}>
                  {masked ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                </button>
                <button type="button" className="icon-btn" onClick={() => setPassword(fresh())} aria-label="Generate a different password">
                  <IconRefresh size={18} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn btn-primary" onClick={addAndOpen} disabled={!password} data-testid="save-panel-open">
                Copy password &amp; open site
                <IconArrowRight size={18} />
              </button>
              <button type="submit" className="btn btn-ghost" disabled={!password} data-testid="save-add">
                <IconPlus size={18} />
                Just add to list
              </button>
            </div>
          </form>
          {justOpened && (
            <div className="mt-5 rounded-xl border border-primary/30 bg-primary/[0.06] p-4" role="status">
              <p className="mb-3 text-sm font-medium text-ink">{justOpened} is open in a new tab. Now:</p>
              <NextSteps />
            </div>
          )}
        </section>

        <section className="card overflow-hidden" aria-labelledby={`${idBase}-list`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:p-4">
            <div className="mr-auto">
              <h2 id={`${idBase}-list`} className="text-sm font-semibold" data-testid="save-count">
                Transfer list · {entries.length} {entries.length === 1 ? 'login' : 'logins'}
              </h2>
              <p className="text-xs text-subtle">Memory only — use it to add these logins to another browser.</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost !min-h-[2.75rem]"
              onClick={() => {
                onClear();
                announce('Transfer list cleared');
              }}
              disabled={!entries.length}
            >
              <IconTrash size={16} />
              Clear
            </button>
            <button type="button" className="btn btn-primary !min-h-[2.75rem]" onClick={() => dialogRef.current?.showModal()} disabled={!entries.length} data-testid="save-download">
              <IconDownload size={18} />
              Download transfer file
            </button>
          </div>
          {entries.length ? (
            <ul className="divide-y divide-line" data-testid="save-list">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white/5 font-display text-sm font-semibold uppercase text-primary" aria-hidden="true">
                    {e.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="truncate text-xs text-subtle">
                      {e.username || 'no username'} · <span className="font-mono">{'•'.repeat(Math.min(e.password.length, 12))}</span>
                    </p>
                  </div>
                  <button type="button" className="icon-btn !h-10 !w-10" onClick={() => onRemove(e.id)} aria-label={`Remove ${e.name} from the list`}>
                    <IconTrash size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-muted">No logins yet. Add one above, or use “Save in your browser” under any generated password.</p>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <section className="card p-4 sm:p-6" aria-labelledby={`${idBase}-other`}>
          <h2 id={`${idBase}-other`} className="text-lg font-semibold">
            Use it in another browser
          </h2>
          <p className="mt-1 text-sm text-muted">Pick the browser you want the passwords in. The same transfer file works in all of them.</p>
          <div className="seg mt-4 !grid w-full grid-cols-2 sm:grid-cols-4" role="radiogroup" aria-label="Browser">
            {BROWSERS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={browser === b.id}
                className="seg-btn !px-2 text-[0.8rem] sm:text-sm"
                onClick={() => setBrowser(b.id)}
                data-testid={`browser-${b.id}`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <h3 className="mt-5 text-sm font-semibold text-ink">Import into {current.label}</h3>
          <ol className="mt-3 space-y-3" data-testid="browser-steps">
            {['Download the transfer file from this page.', ...current.importSteps, 'Delete the .csv file and empty the trash.'].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full border border-primary/30 bg-primary/10 font-mono text-xs text-primary">{i + 1}</span>
                <span className="text-sm text-muted">{t}</span>
              </li>
            ))}
          </ol>

          <h3 className="mt-6 text-sm font-semibold text-ink">Same browser on your other devices</h3>
          <p className="mt-2 text-sm text-muted">{current.sync}</p>
        </section>

        <section className="card p-4 text-sm text-muted sm:p-6" aria-label="Good to know">
          <p className="flex items-center gap-2 font-medium text-ink">
            <IconInfo size={16} className="text-primary" />
            Good to know
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-primary">
            <li>Browsers sync passwords only with the same browser (Chrome ↔ Chrome, Firefox ↔ Firefox). To use them in a different browser, import the transfer file there.</li>
            <li>Importing is done in the desktop version of each browser; synced passwords then reach that browser on your phone.</li>
            <li>If a browser already has a password for the same site and username, it keeps or asks before replacing it.</li>
            <li>VaultKey never sends your passwords anywhere — the site opens in your own browser, and the file is created on your device.</li>
          </ul>
        </section>
      </div>

      <dialog ref={dialogRef} className="vk-dialog" aria-labelledby={`${idBase}-dl`} data-testid="save-download-dialog">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-warn/15 text-warn">
              <IconAlert size={20} />
            </span>
            <h2 id={`${idBase}-dl`} className="text-lg font-semibold">
              Download an unencrypted password file?
            </h2>
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted">
            <p>
              The .csv will contain <strong className="text-ink">{entries.length} passwords in plain text</strong>, ready to import into Chrome, Edge, Firefox or Apple
              Passwords.
            </p>
            <p>Don’t open it in a spreadsheet app, and don’t keep it in a synced folder. Import it straight away, then delete it and empty the trash.</p>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()} autoFocus>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={download} data-testid="save-download-confirm">
              <IconDownload size={18} />I understand, download
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
