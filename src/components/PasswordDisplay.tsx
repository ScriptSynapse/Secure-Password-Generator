import { useRef } from 'react';
import { IconCheck, IconCopy, IconEye, IconEyeOff, IconRefresh } from './Icons';
import type { CopyState } from '../hooks/useClipboard';

function charClass(c: string) {
  if (/[0-9]/.test(c)) return 'text-num';
  if (/[A-Za-z]/.test(c)) return 'text-ink';
  return 'text-sym';
}

interface Props {
  value: string;
  /** Changes on every generation so the reveal animation replays. */
  nonce: number;
  masked: boolean;
  onToggleMask: () => void;
  onCopy: (el: HTMLElement | null) => void;
  onRegenerate: () => void;
  copyState: CopyState;
  label?: string;
  placeholder?: string;
  animate?: boolean;
  testId?: string;
}

export function PasswordDisplay({
  value,
  nonce,
  masked,
  onToggleMask,
  onCopy,
  onRegenerate,
  copyState,
  label = 'Generated password',
  placeholder = 'Adjust your settings to generate a password',
  animate = true,
  testId = 'password-output',
}: Props) {
  const textRef = useRef<HTMLDivElement>(null);
  const chars = Array.from(value);
  const copied = copyState === 'copied';

  return (
    <div className="card glow-border p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span id={`${testId}-label`} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        <span className="text-xs tabular-nums text-subtle" aria-hidden="true">
          {value ? `${chars.length} chars` : ''}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div
          ref={textRef}
          role="textbox"
          aria-readonly="true"
          aria-labelledby={`${testId}-label`}
          aria-label={masked ? 'Password hidden. Use Show password to reveal it.' : undefined}
          tabIndex={0}
          data-testid={testId}
          data-masked={masked ? 'true' : 'false'}
          className="min-h-[3.25rem] min-w-0 flex-1 select-all break-all rounded-xl bg-black/30 px-3 py-2.5 font-mono text-[1.15rem] leading-relaxed tracking-wide sm:text-[1.35rem]"
        >
          {!value ? (
            <span className="font-sans text-base text-subtle">{placeholder}</span>
          ) : masked ? (
            <span className="text-muted" aria-hidden="true">
              {'•'.repeat(chars.length)}
            </span>
          ) : (
            <span key={nonce}>
              {chars.map((c, i) => (
                <span
                  key={i}
                  className={`${charClass(c)} ${animate ? 'char-in' : ''}`}
                  style={animate ? { animationDelay: `${Math.min(i * 12, 400)}ms` } : undefined}
                >
                  {c}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`btn btn-primary relative flex-1 sm:flex-none ${copied ? 'pop' : ''}`}
          onClick={() => onCopy(textRef.current)}
          disabled={!value}
          data-testid={`${testId}-copy`}
        >
          {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
          {copied ? 'Copied' : 'Copy'}
          {copied && <span className="success-ring" aria-hidden="true" />}
        </button>
        <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={onRegenerate} data-testid={`${testId}-regenerate`}>
          <IconRefresh size={18} />
          Regenerate
        </button>
        <button
          type="button"
          className="icon-btn ml-auto"
          onClick={onToggleMask}
          aria-pressed={masked}
          aria-label={masked ? 'Show password' : 'Hide password'}
          title={masked ? 'Show password' : 'Hide password'}
          data-testid={`${testId}-mask`}
        >
          {masked ? <IconEye size={18} /> : <IconEyeOff size={18} />}
        </button>
      </div>
      {copyState === 'manual' && (
        <p className="mt-3 text-sm text-warn" role="alert">
          Your browser blocked automatic copying. The password is selected — press Ctrl+C (or ⌘C) to copy it.
        </p>
      )}
      {copyState === 'error' && (
        <p className="mt-3 text-sm text-warn" role="alert">
          Copying isn't available here. Select the password and copy it manually.
        </p>
      )}
    </div>
  );
}
