import { useCallback, useEffect, useState } from 'react';
import type { PassphraseOptions } from '../types/password';
import { DEFAULT_PASSPHRASE_OPTIONS, MAX_WORDS, MIN_WORDS, SEPARATORS, generatePassphrase } from '../lib/passphrase';
import { passphraseEntropyBits } from '../lib/passwordStrength';
import { useClipboard } from '../hooks/useClipboard';
import { useAnnounce } from '../hooks/useAnnouncer';
import { PasswordDisplay } from './PasswordDisplay';
import { StrengthMeter } from './StrengthMeter';
import { IconRotateCcw } from './Icons';
import { SaveToBrowserButton } from './SaveToBrowser';

type List = readonly string[];

export function PassphraseGenerator({ onSaveToBrowser }: { onSaveToBrowser?: (value: string) => void }) {
  const announce = useAnnounce();
  const [list, setList] = useState<List | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [opts, setOpts] = useState<PassphraseOptions>({ ...DEFAULT_PASSPHRASE_OPTIONS });
  const [value, setValue] = useState('');
  const [nonce, setNonce] = useState(0);
  const [masked, setMasked] = useState(false);
  const { state: copyState, copy } = useClipboard();

  useEffect(() => {
    let alive = true;
    import('../lib/wordlist')
      .then((m) => {
        if (!alive) return;
        setList(m.WORDLIST);
        setValue(generatePassphrase(DEFAULT_PASSPHRASE_OPTIONS, m.WORDLIST));
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  const regen = useCallback(
    (o: PassphraseOptions = opts, say = true) => {
      if (!list) return;
      setValue(generatePassphrase(o, list));
      setNonce((n) => n + 1);
      if (say) announce('New passphrase generated');
    },
    [list, opts, announce],
  );

  const update = (patch: Partial<PassphraseOptions>) => {
    const next = { ...opts, ...patch };
    setOpts(next);
    regen(next, false);
  };

  const bits = passphraseEntropyBits(opts.words, list?.length ?? 7776, opts.includeNumber);
  const pct = ((opts.words - MIN_WORDS) / (MAX_WORDS - MIN_WORDS)) * 100;

  if (loadError) {
    return (
      <div className="card p-6 text-warn" role="alert">
        The word list couldn't be loaded. Check your connection and reload the page.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
      <div className="space-y-4">
        <PasswordDisplay
          value={value}
          nonce={nonce}
          masked={masked}
          onToggleMask={() => setMasked((m) => !m)}
          onRegenerate={() => regen()}
          onCopy={async (el) => {
            const ok = await copy(value, el);
            announce(ok ? 'Passphrase copied to clipboard' : 'Automatic copy blocked. The passphrase is selected for manual copying.');
          }}
          copyState={copyState}
          label="Generated passphrase"
          placeholder={list ? '' : 'Loading word list…'}
          testId="passphrase-output"
        />
        {onSaveToBrowser && <SaveToBrowserButton onClick={() => onSaveToBrowser(value)} disabled={!value} />}
        <StrengthMeter
          kind="passphrase"
          bits={bits}
          facts={[
            ['Words', String(opts.words)],
            ['Word list', (list?.length ?? 7776).toLocaleString('en-US')],
            ['Characters', value ? String(value.length) : '—'],
          ]}
          chips={[opts.capitalize ? 'Capitalised' : 'Lowercase words', opts.includeNumber ? 'Includes a number' : 'Words only']}
        />
      </div>

      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Passphrase settings</h2>
          <button
            type="button"
            className="btn btn-ghost !min-h-[2.5rem] !px-3 text-sm"
            onClick={() => {
              setOpts({ ...DEFAULT_PASSPHRASE_OPTIONS });
              regen({ ...DEFAULT_PASSPHRASE_OPTIONS }, false);
            }}
            data-testid="passphrase-reset"
          >
            <IconRotateCcw size={16} />
            Reset
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label htmlFor="pp-words" className="text-[0.95rem] font-medium">
              Number of words
            </label>
            <span className="font-display text-lg font-semibold tabular-nums" aria-hidden="true">
              {opts.words}
            </span>
          </div>
          <input
            id="pp-words"
            type="range"
            className="range mt-1"
            min={MIN_WORDS}
            max={MAX_WORDS}
            value={opts.words}
            style={{ ['--pct' as string]: `${pct}%` }}
            onChange={(e) => update({ words: Number(e.target.value) })}
            aria-valuetext={`${opts.words} words`}
            data-testid="passphrase-words"
          />
          <p className="text-sm text-subtle">6 or more words is a good default for important accounts.</p>
        </div>

        <fieldset className="mt-5">
          <legend className="text-[0.95rem] font-medium">Separator</legend>
          <div className="seg mt-2 !grid w-full grid-cols-3 sm:grid-cols-5" role="radiogroup" aria-label="Separator">
            {SEPARATORS.map((s) => (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={opts.separator === s.value}
                aria-label={s.label}
                className="seg-btn !px-2"
                onClick={() => update({ separator: s.value })}
                data-testid={`sep-${s.label.toLowerCase()}`}
              >
                <span className="font-mono text-base">{s.value === ' ' ? '␣' : s.value}</span>
                <span className="ml-1.5 hidden text-xs sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 space-y-0.5">
          <label htmlFor="pp-cap" className="flex min-h-[3rem] cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03]">
            <input id="pp-cap" type="checkbox" role="switch" className="switch mt-0.5" checked={opts.capitalize} onChange={(e) => update({ capitalize: e.target.checked })} data-testid="passphrase-capitalize" />
            <span>
              <span className="block font-medium">Capitalise words</span>
              <span className="block text-sm text-subtle">Helps with sites that require uppercase letters. Adds no entropy.</span>
            </span>
          </label>
          <label htmlFor="pp-num" className="flex min-h-[3rem] cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03]">
            <input id="pp-num" type="checkbox" role="switch" className="switch mt-0.5" checked={opts.includeNumber} onChange={(e) => update({ includeNumber: e.target.checked })} data-testid="passphrase-number" />
            <span>
              <span className="block font-medium">Include a number</span>
              <span className="block text-sm text-subtle">Adds one random digit to one random word.</span>
            </span>
          </label>
        </div>

        <p className="mt-5 rounded-xl border border-line bg-black/20 p-3 text-sm text-muted">
          Words are drawn independently and uniformly from a bundled list of 7,776 English words (≈ 12.9 bits each) using{' '}
          <code className="font-mono text-ink">crypto.getRandomValues()</code>. The list is derived from the open-source SCOWL / Hunspell en_US dictionary.
        </p>
      </div>
    </div>
  );
}
