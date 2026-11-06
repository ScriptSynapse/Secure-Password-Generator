import type { GenerationPlan, PasswordOptions } from '../types/password';
import { secureRandomInt, secureShuffle } from './crypto';
import { planGeneration } from './passwordValidation';

/**
 * Password generation algorithm
 * -----------------------------
 * 1. Validate options and build the character pool (planGeneration).
 * 2. Draw a candidate of the requested length from the CSPRNG:
 *    - default:           each position uniform over the pool;
 *    - no consecutive:    each position uniform over the pool minus the previous character;
 *    - no duplicates:     a partial Fisher–Yates shuffle of the pool (uniform ordered sample
 *                         without replacement).
 * 3. If any selected category is missing, discard the whole candidate and draw again.
 * 4. Apply a final CSPRNG Fisher–Yates shuffle (not in "no consecutive" mode, where a
 *    shuffle could reintroduce adjacent repeats).
 *
 * Step 3 is rejection sampling over whole passwords: the output is exactly uniform over the
 * set of passwords that satisfy every rule. This avoids the subtle bias of the common
 * "insert one of each type, fill, then shuffle" approach, while still guaranteeing that every
 * selected character type appears. Step 4 does not change that distribution; it is kept as
 * defence in depth. The expected number of redraws is small (typically 1–3).
 */

const MAX_ATTEMPTS = 20_000;

export class GenerationFailedError extends Error {
  constructor() {
    super('Could not generate a password that satisfies every rule. Try relaxing an option.');
    this.name = 'GenerationFailedError';
  }
}

function drawCandidate(plan: GenerationPlan): string[] {
  const { pool } = plan.charset;
  const len = plan.options.length;
  const out: string[] = new Array(len);

  if (plan.noDuplicates) {
    const copy = pool.slice();
    for (let i = 0; i < len; i += 1) {
      const j = i + secureRandomInt(copy.length - i);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
      out[i] = copy[i];
    }
    copy.fill('');
    return out;
  }

  if (plan.noConsecutive) {
    let prev = -1;
    for (let i = 0; i < len; i += 1) {
      let idx: number;
      if (prev < 0) idx = secureRandomInt(pool.length);
      else {
        idx = secureRandomInt(pool.length - 1);
        if (idx >= prev) idx += 1;
      }
      out[i] = pool[idx];
      prev = idx;
    }
    return out;
  }

  for (let i = 0; i < len; i += 1) out[i] = pool[secureRandomInt(pool.length)];
  return out;
}

function satisfiesCategories(chars: string[], plan: GenerationPlan): boolean {
  return plan.charset.categories.every((cat) => {
    const set = cat.chars;
    return chars.some((c) => set.includes(c));
  });
}

export interface GeneratedPassword {
  value: string;
  plan: GenerationPlan;
}

export function generateFromPlan(plan: GenerationPlan): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const chars = drawCandidate(plan);
    if (!satisfiesCategories(chars, plan)) {
      chars.fill('');
      continue;
    }
    if (!plan.noConsecutive) secureShuffle(chars);
    const value = chars.join('');
    chars.fill('');
    return value;
  }
  throw new GenerationFailedError();
}

/** Generate one password. Throws PasswordOptionsError on invalid options. */
export function generatePassword(options: PasswordOptions): GeneratedPassword {
  const plan = planGeneration(options);
  return { value: generateFromPlan(plan), plan };
}

/** Generate `count` independent passwords with the same options. */
export function generateMany(options: PasswordOptions, count: number): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new RangeError('Count must be between 1 and 100.');
  const plan = planGeneration(options);
  return Array.from({ length: count }, () => generateFromPlan(plan));
}
