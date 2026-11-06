import { useId, useState } from 'react';
import type { CharCategory, PasswordOptions } from '../types/password';
import type { GenerationPlan } from '../types/password';
import { MAX_LENGTH, MIN_LENGTH, clampLength, sanitizeCustomSymbols } from '../lib/passwordValidation';
import { IconChevronDown, IconInfo, IconMinus, IconPlus, IconRotateCcw } from './Icons';

interface Props {
  options: PasswordOptions;
  plan: GenerationPlan | null;
  issues: string[];
  update: (patch: Partial<PasswordOptions>) => boolean;
  reset: () => void;
}

const CATEGORIES: { id: CharCategory; label: string; sample: string }[] = [
  { id: 'uppercase', label: 'Uppercase letters', sample: 'A–Z' },
  { id: 'lowercase', label: 'Lowercase letters', sample: 'a–z' },
  { id: 'numbers', label: 'Numbers', sample: '0–9' },
  { id: 'symbols', label: 'Symbols', sample: '!@#$%^&*' },
];

function ToggleRow({
  id,
  checked,
  onChange,
  label,
  hint,
  kind = 'switch',
  testId,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  kind?: 'switch' | 'check';
  testId?: string;
}) {
  return (
    <label htmlFor={id} className="flex min-h-[3rem] cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
      <input
        id={id}
        type="checkbox"
        role={kind === 'switch' ? 'switch' : undefined}
        className={`${kind} mt-0.5`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        data-testid={testId}
      />
      <span className="min-w-0">
        <span className="block text-[0.95rem] font-medium text-ink">{label}</span>
        {hint && (
          <span id={`${id}-hint`} className="block text-sm text-subtle">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

export function PasswordControls({ options, plan, issues, update, reset }: Props) {
  const uid = useId();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [lastCategoryMsg, setLastCategoryMsg] = useState(false);
  const [lengthDraft, setLengthDraft] = useState<string | null>(null);
  const customCheck = sanitizeCustomSymbols(options.customSymbols);
  const pct = ((options.length - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * 100;

  const setLength = (v: number) => update({ length: clampLength(v) });
  const toggleCategory = (id: CharCategory, v: boolean) => {
    const ok = update({ [id]: v } as Partial<PasswordOptions>);
    setLastCategoryMsg(!ok);
  };

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Settings</h2>
        <button type="button" className="btn btn-ghost !min-h-[2.5rem] !px-3 text-sm" onClick={reset} data-testid="reset-settings">
          <IconRotateCcw size={16} />
          Reset to defaults
        </button>
      </div>

      {/* Length */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`${uid}-len-range`} className="text-[0.95rem] font-medium">
            Password length
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="icon-btn !h-10 !w-10"
              aria-label="Decrease length"
              onClick={() => setLength(options.length - 1)}
              disabled={options.length <= MIN_LENGTH}
              data-testid="length-decrement"
            >
              <IconMinus size={16} />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_LENGTH}
              max={MAX_LENGTH}
              aria-label="Password length in characters"
              className="input !min-h-10 !w-16 text-center !font-sans text-lg font-semibold tabular-nums"
              value={lengthDraft ?? String(options.length)}
              onChange={(e) => {
                setLengthDraft(e.target.value);
                const n = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(n) && n >= MIN_LENGTH && n <= MAX_LENGTH) setLength(n);
              }}
              onBlur={() => {
                if (lengthDraft !== null) setLength(clampLength(lengthDraft));
                setLengthDraft(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              data-testid="length-input"
            />
            <button
              type="button"
              className="icon-btn !h-10 !w-10"
              aria-label="Increase length"
              onClick={() => setLength(options.length + 1)}
              disabled={options.length >= MAX_LENGTH}
              data-testid="length-increment"
            >
              <IconPlus size={16} />
            </button>
          </div>
        </div>
        <input
          id={`${uid}-len-range`}
          type="range"
          className="range mt-1"
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          step={1}
          value={options.length}
          style={{ ['--pct' as string]: `${pct}%` }}
          onChange={(e) => setLength(Number(e.target.value))}
          aria-valuetext={`${options.length} characters`}
          data-testid="length-slider"
        />
        <div className="flex justify-between text-xs text-subtle" aria-hidden="true">
          <span>{MIN_LENGTH}</span>
          <span>{MAX_LENGTH}</span>
        </div>
      </div>

      {/* Categories */}
      <fieldset className="mt-5">
        <legend className="text-[0.95rem] font-medium">Character types</legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <label
              key={c.id}
              htmlFor={`${uid}-${c.id}`}
              className={`flex min-h-[3rem] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                options[c.id] ? 'border-primary/35 bg-primary/[0.06]' : 'border-line hover:bg-white/[0.03]'
              }`}
            >
              <input
                id={`${uid}-${c.id}`}
                type="checkbox"
                className="check"
                checked={options[c.id]}
                onChange={(e) => toggleCategory(c.id, e.target.checked)}
                data-testid={`cat-${c.id}`}
              />
              <span className="min-w-0 flex-1 text-[0.95rem] font-medium">{c.label}</span>
              <span className="font-mono text-sm text-subtle" aria-hidden="true">
                {c.id === 'symbols' && options.useCustomSymbols ? customCheck.value.slice(0, 8) || '—' : c.sample}
              </span>
            </label>
          ))}
        </div>
        <p className={`mt-2 text-sm ${lastCategoryMsg ? 'text-warn' : 'text-subtle'}`} aria-live="polite" data-testid="category-hint">
          {lastCategoryMsg ? 'At least one character type must stay selected.' : 'Every selected type is guaranteed to appear in the password.'}
        </p>
      </fieldset>

      {/* Advanced */}
      <div className="mt-5 border-t border-line pt-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-xl py-2 text-left text-[0.95rem] font-medium"
          aria-expanded={advancedOpen}
          aria-controls={`${uid}-adv`}
          onClick={() => setAdvancedOpen((o) => !o)}
          data-testid="advanced-toggle"
        >
          Advanced options
          <IconChevronDown size={18} className={`text-muted transition-transform duration-300 ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>
        <div id={`${uid}-adv`} hidden={!advancedOpen} className="mt-1 space-y-0.5">
          <ToggleRow
            id={`${uid}-amb`}
            checked={options.excludeAmbiguous}
            onChange={(v) => update({ excludeAmbiguous: v })}
            label="Exclude ambiguous symbols"
            hint={'Removes { } [ ] ( ) / \\ \' " ` ~ , ; : . < > — handy for forms, shells and CSV.'}
            testId="opt-ambiguous"
          />
          <ToggleRow
            id={`${uid}-sim`}
            checked={options.excludeSimilar}
            onChange={(v) => update({ excludeSimilar: v })}
            label="Exclude similar-looking characters"
            hint="Removes i I l L 1 | o O 0 so passwords are easier to read and type."
            testId="opt-similar"
          />
          <ToggleRow
            id={`${uid}-consec`}
            checked={options.avoidConsecutive}
            onChange={(v) => update({ avoidConsecutive: v })}
            label="Avoid consecutive repeats"
            hint="No character appears twice in a row (e.g. no “aa”)."
            testId="opt-consecutive"
          />
          <ToggleRow
            id={`${uid}-dup`}
            checked={options.avoidDuplicates}
            onChange={(v) => update({ avoidDuplicates: v })}
            label="Avoid duplicate characters"
            hint="Use each character at most once, when enough characters are available."
            testId="opt-duplicates"
          />
          <ToggleRow
            id={`${uid}-custom`}
            checked={options.useCustomSymbols}
            onChange={(v) => update({ useCustomSymbols: v })}
            label="Choose my own symbols"
            hint="Some sites only accept certain symbols. Pick exactly which ones to use."
            testId="opt-custom-symbols"
          />
          {options.useCustomSymbols && (
            <div className="px-3 pb-2 pl-[3.6rem]">
              <label htmlFor={`${uid}-symset`} className="text-sm text-muted">
                Allowed symbols
              </label>
              <input
                id={`${uid}-symset`}
                className="input mt-1"
                value={options.customSymbols}
                maxLength={64}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                onChange={(e) => update({ customSymbols: e.target.value })}
                aria-describedby={`${uid}-symset-hint`}
                data-testid="custom-symbols-input"
              />
              <p id={`${uid}-symset-hint`} className={`mt-1 text-xs ${customCheck.rejected.length ? 'text-warn' : 'text-subtle'}`}>
                {customCheck.rejected.length
                  ? `Ignored (not ASCII symbols): ${customCheck.rejected.map((c) => (c === ' ' ? 'space' : c)).join(' ')}`
                  : `${customCheck.value.length} symbol${customCheck.value.length === 1 ? '' : 's'} in use. Letters, numbers and spaces are ignored.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Problems and applied rules */}
      {issues.length > 0 && (
        <div role="alert" className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn" data-testid="options-issues">
          {issues.map((i) => (
            <p key={i}>{i}</p>
          ))}
        </div>
      )}
      {plan && plan.notices.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-black/20 p-3" data-testid="rules-applied">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <IconInfo size={16} className="text-primary" />
            Rules applied
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-muted">
            {plan.notices.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="mt-2 h-1 w-1 flex-none rounded-full bg-primary" aria-hidden="true" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
