import { strengthFromBits, describeCrackTime } from '../lib/passwordStrength';
import { Link } from '../lib/router';
import { IconAlert, IconGauge, IconShield } from './Icons';

const COLORS = ['#ff6b6b', '#ff9f5a', '#f5b84b', '#5fe3a8', '#00e59b'];

interface Props {
  bits: number;
  /** Rows of facts shown under the meter, e.g. [["Length", "20"], ...]. */
  facts: [string, string][];
  chips?: string[];
  kind?: 'password' | 'passphrase';
}

export function StrengthMeter({ bits, facts, chips = [], kind = 'password' }: Props) {
  const s = strengthFromBits(bits);
  const pct = Math.max(6, Math.min(100, (bits / 128) * 100));
  const color = COLORS[s.level];
  const Icon = s.level >= 3 ? IconShield : s.level === 2 ? IconGauge : IconAlert;

  return (
    <section className="card p-4 sm:p-5" aria-labelledby={`strength-${kind}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`strength-${kind}`} className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
          Estimated strength
        </h2>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color }} data-testid={`strength-label-${kind}`}>
          <Icon size={16} />
          {s.label}
        </span>
      </div>

      <div
        className="mt-3"
        role="meter"
        aria-label="Estimated password strength"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={s.level}
        aria-valuetext={`${s.label}, about ${Math.floor(bits)} bits of entropy`}
      >
        <div className="relative h-2.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-700 ease-out"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COLORS[Math.max(0, s.level - 1)]}, ${color})`, boxShadow: `0 0 16px ${color}66` }}
          />
        </div>
        <div className="mt-2 hidden grid-cols-5 gap-1 sm:grid text-[0.65rem] font-medium uppercase tracking-wider text-subtle" aria-hidden="true">
          {['Very weak', 'Weak', 'Moderate', 'Strong', 'Very strong'].map((l, i) => (
            <span key={l} className={`truncate ${i === s.level ? 'text-ink' : ''} ${i === 4 ? 'text-right' : i === 0 ? '' : 'text-center'}`}>
              {l}
            </span>
          ))}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-black/20 p-3">
          <dt className="text-xs text-subtle">Entropy</dt>
          <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink" data-testid={`entropy-${kind}`}>
            ≈ {bits.toFixed(1)} <span className="text-sm font-medium text-muted">bits</span>
          </dd>
        </div>
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-black/20 p-3">
            <dt className="text-xs text-subtle">{k}</dt>
            <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Character types included">
          {chips.map((c) => (
            <li key={c} className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {c}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-sm leading-relaxed text-muted">
        {kind === 'password'
          ? 'Entropy counts every password VaultKey could have produced with these exact settings. '
          : 'Entropy assumes an attacker knows the 7,776-word list and your settings. '}
        At a very fast offline attack of 100 billion guesses per second, finding it would take{' '}
        <strong className="text-ink">{describeCrackTime(bits)}</strong> on average. This is an estimate, not a guarantee — it assumes the
        password is kept secret and never reused.{' '}
        <Link to="/security#entropy" className="text-primary underline underline-offset-2">
          How we calculate this
        </Link>
      </p>
    </section>
  );
}
