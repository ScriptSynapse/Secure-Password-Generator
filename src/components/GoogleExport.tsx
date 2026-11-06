import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { PasswordOptions } from '../types/password';
import { buildGoogleCsv, normalizeSite, GOOGLE_IMPORT_LIMIT, GOOGLE_PM_URL, type GoogleEntry } from '../lib/googleCsv';
import { generatePassword } from '../lib/generator';
import { useAnnounce } from '../hooks/useAnnouncer';
import { IconAlert, IconArrowRight, IconDownload, IconEye, IconEyeOff, IconInfo, IconPlus, IconRefresh, IconTrash } from './Icons';

export type NewGoogleEntry = Omit<GoogleEntry, 'id'>;

/** Google "G" mark drawn with simple shapes (no external assets). */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.74 2.97-4.3 2.97-7.33Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.07a10 10 0 0 0 0 8.96L6.4 13.9Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

interface FieldsProps {
  idBase: string;
  site: string;
  setSite: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  siteError: string | null;
}

function EntryFields({ idBase, site, setSite, username, setUsername, note, setNote, siteError }: FieldsProps) {
  return (
    <>
      <div>
        <label htmlFor={`${idBase}-site`} className="text-sm font-medium">
          Website <span className="text-subtle">(required)</span>
        </label>
        <input
          id={`${idBase}-site`}
          className="input mt-1 !font-sans"
          placeholder="e.g. github.com"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={!!siteError}
          aria-describedby={siteError ? `${idBase}-site-err` : undefined}
          data-testid="google-site"
        />
        {siteError && (
          <p id={`${idBase}-site-err`} className="mt-1 text-sm text-warn">
            {siteError}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${idBase}-user`} className="text-sm font-medium">
          Username or email
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
          data-testid="google-username"
        />
      </div>
      <div>
        <label htmlFor={`${idBase}-note`} className="text-sm font-medium">
          Note <span className="text-subtle">(optional)</span>
        </label>
        <input
          id={`${idBase}-note`}
          className="input mt-1 !font-sans"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoComplete="off"
          maxLength={500}
          data-testid="google-note"
        />
      </div>
    </>
  );
}

/** Modal used from the Password, Passphrase and Bulk tabs to queue one password for Google. */
export function SaveToGoogleDialog({
  password,
  onClose,
  onAdd,
}: {
  password: string | null;
  onClose: () => void;
  onAdd: (e: NewGoogleEntry) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idBase = useId();
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [siteError, setSiteError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (password && !d.open) {
      setSite('');
      setUsername('');
      setNote('');
      setSiteError(null);
      d.showModal();
    } else if (!password && d.open) d.close();
  }, [password]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    const r = normalizeSite(site);
    if (!r.ok) {
      setSiteError(r.error);
      return;
    }
    onAdd({ name: r.name, url: r.url, username: username.trim(), password, note: note.trim() });
    onClose();
  };

  return (
    <dialog ref={ref} className="vk-dialog" aria-labelledby={`${idBase}-t`} onClose={onClose} data-testid="google-dialog">
      <form onSubmit={submit} className="p-6" noValidate>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white">
            <GoogleMark size={22} />
          </span>
          <div>
            <h2 id={`${idBase}-t`} className="text-lg font-semibold">
              Add to Google Password Manager list
            </h2>
            <p className="text-sm text-muted">Which login is this password for?</p>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <EntryFields {...{ idBase, site, setSite: (v) => (setSite(v), setSiteError(null)), username, setUsername, note, setNote, siteError }} />
          <p className="rounded-xl border border-line bg-black/20 p-3 text-xs text-muted">
            The password is added to an in-memory list on this page. Open the <strong className="text-ink">Google</strong> tab to download the import file — nothing is
            sent to Google or anyone else from here.
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" data-testid="google-dialog-add">
            <IconPlus size={18} />
            Add to list
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Trigger button shown under each generated password. */
export function SaveToGoogleButton({ onClick, disabled, compact = false }: { onClick: () => void; disabled?: boolean; compact?: boolean }) {
  if (compact) {
    return (
      <button type="button" className="icon-btn !h-10 !w-10" onClick={onClick} disabled={disabled} aria-label="Add to Google Password Manager list" title="Add to Google Password Manager list">
        <GoogleMark size={16} />
      </button>
    );
  }
  return (
    <button type="button" className="btn btn-ghost w-full" onClick={onClick} disabled={disabled} data-testid="save-to-google">
      <GoogleMark size={18} />
      Save to Google Password Manager
    </button>
  );
}

interface PanelProps {
  entries: GoogleEntry[];
  onAdd: (e: NewGoogleEntry) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  options: PasswordOptions;
}

const STEPS = [
  { title: 'Download the import file', text: 'Use “Download for Google” on this page. The .csv is created on your device.' },
  {
    title: 'Open Google Password Manager settings',
    text: 'On a computer: Chrome menu → Passwords and autofill → Google Password Manager → Settings, or open passwords.google.com.',
  },
  { title: 'Import the file', text: 'Under “Import passwords”, choose Select file, pick the .csv, and follow the prompts.' },
  { title: 'Delete the file', text: 'Anyone who can open the .csv can read every password in it. Delete it and empty the trash.' },
];

/** The "Google" tab: build a list of logins and export them in Google's import format. */
export function GoogleExportPanel({ entries, onAdd, onRemove, onClear, options }: PanelProps) {
  const announce = useAnnounce();
  const idBase = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [siteError, setSiteError] = useState<string | null>(null);
  const [masked, setMasked] = useState(true);
  const fresh = () => {
    try {
      return generatePassword(options).value;
    } catch {
      return '';
    }
  };
  const [password, setPassword] = useState(fresh);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const r = normalizeSite(site);
    if (!r.ok) {
      setSiteError(r.error);
      return;
    }
    if (!password) return;
    if (entries.length >= GOOGLE_IMPORT_LIMIT) {
      setSiteError(`Google imports up to ${GOOGLE_IMPORT_LIMIT} passwords per file. Download this list first.`);
      return;
    }
    onAdd({ name: r.name, url: r.url, username: username.trim(), password, note: note.trim() });
    setSite('');
    setUsername('');
    setNote('');
    setPassword(fresh());
  };

  const download = () => {
    const csv = buildGoogleCsv(entries);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaultkey-google-passwords.csv';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    dialogRef.current?.close();
    announce('Google import file downloaded');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
      <div className="space-y-4">
        <section className="card p-4 sm:p-6" aria-labelledby={`${idBase}-h`}>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-white">
              <GoogleMark size={24} />
            </span>
            <div>
              <h2 id={`${idBase}-h`} className="text-lg font-semibold">
                Save to Google Password Manager
              </h2>
              <p className="mt-1 text-sm text-muted">
                Add the logins you’re creating, then download one file and import it into Google Password Manager. Your passwords are then available in Chrome and on
                Android wherever you’re signed in to Google.
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={add} noValidate>
            <EntryFields {...{ idBase, site, setSite: (v) => (setSite(v), setSiteError(null)), username, setUsername, note, setNote, siteError }} />
            <div>
              <span className="text-sm font-medium" id={`${idBase}-pw`}>
                Password <span className="text-subtle">(generated with your current Password settings)</span>
              </span>
              <div className="mt-1 flex items-center gap-2">
                <code className="input flex min-w-0 items-center break-all text-ink" aria-labelledby={`${idBase}-pw`} data-testid="google-password">
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
            <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={!password} data-testid="google-add">
              <IconPlus size={18} />
              Add to list
            </button>
          </form>
        </section>

        <section className="card overflow-hidden" aria-labelledby={`${idBase}-list`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:p-4">
            <h2 id={`${idBase}-list`} className="mr-auto text-sm font-semibold" data-testid="google-count">
              {entries.length} {entries.length === 1 ? 'login' : 'logins'} ready · memory only
            </h2>
            <button
              type="button"
              className="btn btn-ghost !min-h-[2.75rem]"
              onClick={() => {
                onClear();
                announce('Google list cleared');
              }}
              disabled={!entries.length}
            >
              <IconTrash size={16} />
              Clear
            </button>
            <button type="button" className="btn btn-primary !min-h-[2.75rem]" onClick={() => dialogRef.current?.showModal()} disabled={!entries.length} data-testid="google-download">
              <IconDownload size={18} />
              Download for Google
            </button>
          </div>
          {entries.length ? (
            <ul className="divide-y divide-line" data-testid="google-list">
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
            <p className="p-6 text-center text-sm text-muted">No logins yet. Add one above, or use “Save to Google Password Manager” under any generated password.</p>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <section className="card p-4 sm:p-6" aria-labelledby={`${idBase}-how`}>
          <h2 id={`${idBase}-how`} className="text-lg font-semibold">
            How to import
          </h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="grid h-7 w-7 flex-none place-items-center rounded-full border border-primary/30 bg-primary/10 font-mono text-xs text-primary">{i + 1}</span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <a href={GOOGLE_PM_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-5 w-full" data-testid="google-open">
            Open Google Password Manager
            <IconArrowRight size={16} />
          </a>
          <p className="mt-2 text-xs text-subtle">Opens passwords.google.com in a new tab. VaultKey sends nothing to Google — you upload the file yourself.</p>
        </section>

        <section className="card p-4 sm:p-6 text-sm text-muted" aria-label="Good to know">
          <p className="flex items-center gap-2 font-medium text-ink">
            <IconInfo size={16} className="text-primary" />
            Good to know
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-primary">
            <li>Importing needs a computer. Google’s import option isn’t offered in its mobile apps.</li>
            <li>Google accepts up to {GOOGLE_IMPORT_LIMIT.toLocaleString('en-US')} passwords per file.</li>
            <li>If Google already has a password for the same site and username, it asks before replacing it.</li>
            <li>Changing a password? Update it on the website first, then import, so the two stay in sync.</li>
            <li>Only adding one password? Copy it, paste it into the site’s sign-up form, and Chrome will offer to save it for you.</li>
          </ul>
        </section>
      </div>

      <dialog ref={dialogRef} className="vk-dialog" aria-labelledby={`${idBase}-dl`} data-testid="google-download-dialog">
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
              The .csv will contain <strong className="text-ink">{entries.length} passwords in plain text</strong>, in the format Google Password Manager imports.
            </p>
            <p>Don’t open it in a spreadsheet app, and don’t keep it in a synced folder. Import it straight away, then delete it and empty the trash.</p>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()} autoFocus>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={download} data-testid="google-download-confirm">
              <IconDownload size={18} />I understand, download
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
