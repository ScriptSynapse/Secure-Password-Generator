import { useRef, useState, type KeyboardEvent } from 'react';
import { usePasswordGenerator } from '../hooks/usePasswordGenerator';
import { useClipboard, copyText } from '../hooks/useClipboard';
import { useAnnounce } from '../hooks/useAnnouncer';
import { PasswordDisplay } from '../components/PasswordDisplay';
import { StrengthMeter } from '../components/StrengthMeter';
import { PasswordControls } from '../components/PasswordControls';
import { BulkGenerator } from '../components/BulkGenerator';
import { PassphraseGenerator } from '../components/PassphraseGenerator';
import { SavePanel, SaveToBrowserButton, SaveToBrowserDialog, type NewLogin } from '../components/SaveToBrowser';
import type { LoginEntry } from '../lib/browserExport';
import { CATEGORY_LABELS } from '../lib/passwordValidation';
import { replaceHash, useHash } from '../lib/router';
import { IconDevice, IconCopy, IconCpu, IconHistory, IconKey, IconLayers, IconLock, IconQuote, IconServerOff, IconTrash, IconUserOff, IconCheck } from '../components/Icons';

const TABS = [
  { id: 'password', label: 'Password', icon: IconKey },
  { id: 'passphrase', label: 'Passphrase', icon: IconQuote },
  { id: 'bulk', label: 'Bulk', icon: IconLayers },
  { id: 'save', label: 'Save', icon: IconDevice },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function Generator() {
  const hash = useHash().replace('#', '');
  const tab: TabId = (TABS.find((t) => t.id === hash)?.id ?? 'password') as TabId;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const g = usePasswordGenerator();
  const announce = useAnnounce();
  const { state: copyState, copy } = useClipboard();
  const [masked, setMasked] = useState(false);
  const [historyCopied, setHistoryCopied] = useState<number | null>(null);
  // Logins kept for the browser transfer file — memory only, like everything else.
  const [loginList, setLoginList] = useState<LoginEntry[]>([]);
  const [saveTarget, setSaveTarget] = useState<string | null>(null);
  const loginId = useRef(0);
  const addLogin = (e: NewLogin) => {
    loginId.current += 1;
    setLoginList((l) => [...l, { ...e, id: loginId.current }]);
    announce(`Added ${e.name} to your transfer list`);
  };
  const clearLogins = () =>
    setLoginList((l) => {
      l.forEach((x) => (x.password = ''));
      return [];
    });

  const setTab = (id: TabId) => replaceHash(id === 'password' ? '' : id);
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    setTab(TABS[n].id);
    tabRefs.current[n]?.focus();
  };

  const cats = g.plan?.charset.categories ?? [];
  const summary =
    `${g.options.length} characters, ` +
    (cats.map((c) => CATEGORY_LABELS[c.id].toLowerCase()).join(', ') || 'no character types') +
    (g.options.excludeAmbiguous || g.options.excludeSimilar ? ', with exclusions' : '');

  const generate = () => {
    const next = g.regenerate();
    if (next.value) announce('New password generated');
  };

  return (
    <div className="container-vk pb-20 pt-28 sm:pt-32">
      <header className="max-w-3xl">
        <span className="eyebrow">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          Generator
        </span>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Create a strong password</h1>
        <p className="mt-3 text-lg text-muted">Generated on your device with your browser's cryptographic random number generator. Nothing you create here is sent anywhere or saved.</p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Privacy guarantees">
          <li className="chip">
            <IconCpu size={14} className="text-primary" /> Generated in your browser
          </li>
          <li className="chip">
            <IconServerOff size={14} className="text-primary" /> Never sent to a server
          </li>
          <li className="chip">
            <IconUserOff size={14} className="text-primary" /> No account
          </li>
        </ul>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Generator mode" className="seg !grid w-full grid-cols-4 sm:!inline-flex sm:w-auto">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className="seg-btn inline-flex items-center justify-center gap-2 !px-1 text-[0.8rem] sm:!px-4 sm:text-sm"
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              data-testid={`tab-${t.id}`}
            >
              <span className="hidden sm:inline-flex">
                <t.icon size={16} />
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-enter mt-6" key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'password' && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
            <div className="space-y-4">
              <PasswordDisplay
                value={g.value}
                nonce={g.nonce}
                masked={masked}
                onToggleMask={() => setMasked((m) => !m)}
                onRegenerate={generate}
                onCopy={async (el) => {
                  const ok = await copy(g.value, el);
                  if (ok) g.recordCopy(g.value);
                  announce(ok ? 'Password copied to clipboard' : 'Automatic copy blocked. The password is selected for manual copying.');
                }}
                copyState={copyState}
              />
              <button type="button" className="btn btn-primary btn-lg w-full" onClick={generate} data-testid="generate">
                <IconLock size={20} />
                Generate password
              </button>
              <SaveToBrowserButton onClick={() => setSaveTarget(g.value)} disabled={!g.value} />
              <StrengthMeter
                bits={g.bits}
                facts={[
                  ['Length', String(g.options.length)],
                  ['Character pool', String(g.plan?.charset.pool.length ?? 0)],
                  ['Types', String(cats.length)],
                ]}
                chips={cats.map((c) => CATEGORY_LABELS[c.id])}
              />
            </div>
            <div className="space-y-4">
              <PasswordControls options={g.options} plan={g.plan} issues={g.issues} update={g.update} reset={g.reset} />

              <section className="card p-4 sm:p-6" aria-labelledby="history-h">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="history-h" className="flex items-center gap-2 text-lg font-semibold">
                      <IconHistory size={18} className="text-primary" />
                      Session history
                    </h2>
                    <p className="mt-1 text-sm text-muted">Off by default. When on, the last 20 passwords you generate or copy are kept in this tab's memory only — never saved — and vanish when you close or reload the page.</p>
                  </div>
                  <label className="-m-2 grid h-11 w-14 flex-none cursor-pointer place-items-center">
                  <input
                    type="checkbox"
                    role="switch"
                    className="switch"
                    checked={g.historyOn}
                    onChange={(e) => g.toggleHistory(e.target.checked)}
                    aria-label="Keep session history"
                    data-testid="history-toggle"
                  />
                  </label>
                </div>
                {g.historyOn && (
                  <div className="mt-4">
                    {g.history.length === 0 ? (
                      <p className="text-sm text-subtle">Nothing yet. Press “Generate password” or copy a password.</p>
                    ) : (
                      <>
                        <ul className="divide-y divide-line rounded-xl border border-line" data-testid="history-list">
                          {g.history.map((h) => (
                            <li key={h.id} className="flex items-center gap-2 px-3 py-2">
                              <code className="min-w-0 flex-1 truncate font-mono text-sm text-muted">{masked ? '•'.repeat(h.value.length) : h.value}</code>
                              <time className="hidden text-xs text-subtle sm:block" dateTime={new Date(h.at).toISOString()}>
                                {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </time>
                              <button
                                type="button"
                                className={`icon-btn !h-9 !w-9 ${historyCopied === h.id ? 'is-success' : ''}`}
                                aria-label="Copy this password from history"
                                onClick={async () => {
                                  if (await copyText(h.value)) {
                                    setHistoryCopied(h.id);
                                    window.setTimeout(() => setHistoryCopied(null), 1500);
                                    announce('Password copied to clipboard');
                                  }
                                }}
                              >
                                {historyCopied === h.id ? <IconCheck size={15} /> : <IconCopy size={15} />}
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          className="btn btn-ghost mt-3 w-full sm:w-auto"
                          onClick={() => {
                            g.clearHistory();
                            announce('History cleared');
                          }}
                          data-testid="history-clear"
                        >
                          <IconTrash size={16} />
                          Delete history
                        </button>
                      </>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {tab === 'passphrase' && <PassphraseGenerator onSaveToBrowser={setSaveTarget} />}

        {tab === 'bulk' && <BulkGenerator options={g.options} summary={summary} onEditSettings={() => setTab('password')} onSaveToBrowser={setSaveTarget} />}

        {tab === 'save' && (
          <SavePanel entries={loginList} onAdd={addLogin} onRemove={(id) => setLoginList((l) => l.filter((x) => x.id !== id))} onClear={clearLogins} options={g.options} />
        )}
      </div>

      <SaveToBrowserDialog password={saveTarget} onClose={() => setSaveTarget(null)} onAdd={addLogin} />
      {loginList.length > 0 && tab !== 'save' && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4" data-testid="save-toast">
          <button type="button" className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)]" onClick={() => setTab('save')}>
            <IconDevice size={18} className="text-primary" />
            <span>
              {loginList.length} {loginList.length === 1 ? 'login' : 'logins'} in your transfer list
            </span>
            <span className="font-semibold text-primary">Use in other browsers →</span>
          </button>
        </div>
      )}
    </div>
  );
}
