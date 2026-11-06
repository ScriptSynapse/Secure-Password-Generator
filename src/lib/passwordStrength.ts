import type { GenerationPlan, StrengthLevel, StrengthResult } from '../types/password';

/**
 * Strength estimation
 * -------------------
 * For a password produced by VaultKey we know exactly how it was generated, so the
 * entropy estimate is the base-2 logarithm of the number of distinct passwords the
 * generator could have produced with the current settings — the work an attacker who
 * knows your settings would face in a brute-force search.
 *
 * The count is exact (BigInt arithmetic with inclusion–exclusion over the
 * "must contain every selected type" rule). It is an estimate of guessing resistance,
 * not a guarantee: it assumes the password is kept secret, used once, stored with a
 * reasonable hash by the service, and that the browser's CSPRNG is sound.
 */

/** Strength bands, in bits of entropy. */
export const STRENGTH_BANDS: { min: number; level: StrengthLevel; label: StrengthResult['label'] }[] = [
  { min: 80, level: 4, label: 'Very Strong' },
  { min: 60, level: 3, label: 'Strong' },
  { min: 36, level: 2, label: 'Moderate' },
  { min: 28, level: 1, label: 'Weak' },
  { min: -Infinity, level: 0, label: 'Very Weak' },
];

export function strengthFromBits(bits: number): StrengthResult {
  const band = STRENGTH_BANDS.find((b) => bits >= b.min) ?? STRENGTH_BANDS[STRENGTH_BANDS.length - 1];
  return { level: band.level, label: band.label, bits };
}

function pow(base: bigint, exp: number): bigint {
  if (exp <= 0) return 1n;
  return base ** BigInt(exp);
}

function fallingFactorial(m: number, k: number): bigint {
  if (k > m) return 0n;
  let r = 1n;
  for (let i = 0; i < k; i += 1) r *= BigInt(m - i);
  return r;
}

/** Number of strings of length `len` over an alphabet of `m` symbols under the rule set. */
function countStrings(m: number, len: number, mode: 'free' | 'noConsecutive' | 'noDuplicates'): bigint {
  if (m <= 0) return len === 0 ? 1n : 0n;
  if (mode === 'noDuplicates') return fallingFactorial(m, len);
  if (mode === 'noConsecutive') return BigInt(m) * pow(BigInt(m - 1), len - 1);
  return pow(BigInt(m), len);
}

/**
 * Exact number of passwords the generator can output for a plan.
 * Inclusion–exclusion: Σ over subsets S of categories of (−1)^|S| · count(pool − S).
 */
export function countPossiblePasswords(
  categorySizes: number[],
  len: number,
  mode: 'free' | 'noConsecutive' | 'noDuplicates',
): bigint {
  const k = categorySizes.length;
  const total = categorySizes.reduce((a, b) => a + b, 0);
  let sum = 0n;
  for (let mask = 0; mask < 1 << k; mask += 1) {
    let removed = 0;
    let bitsSet = 0;
    for (let i = 0; i < k; i += 1) {
      if (mask & (1 << i)) {
        removed += categorySizes[i];
        bitsSet += 1;
      }
    }
    const c = countStrings(total - removed, len, mode);
    sum += bitsSet % 2 === 0 ? c : -c;
  }
  return sum;
}

/** log2 of a positive BigInt, accurate to ~15 significant digits. */
export function log2BigInt(n: bigint): number {
  if (n <= 0n) return 0;
  const bitLen = n.toString(2).length;
  if (bitLen <= 53) return Math.log2(Number(n));
  const shift = bitLen - 53;
  return Math.log2(Number(n >> BigInt(shift))) + shift;
}

export function planModeOf(plan: GenerationPlan): 'free' | 'noConsecutive' | 'noDuplicates' {
  if (plan.noDuplicates) return 'noDuplicates';
  if (plan.noConsecutive) return 'noConsecutive';
  return 'free';
}

/** Entropy in bits of the generation process described by `plan`. */
export function planEntropyBits(plan: GenerationPlan): number {
  const sizes = plan.charset.categories.map((c) => c.chars.length);
  return log2BigInt(countPossiblePasswords(sizes, plan.options.length, planModeOf(plan)));
}

/** Passphrase entropy: words·log2(list) (+ number placement if enabled). */
export function passphraseEntropyBits(words: number, listSize: number, includeNumber: boolean): number {
  let bits = words * Math.log2(listSize);
  if (includeNumber) bits += Math.log2(10) + Math.log2(words);
  return bits;
}

/**
 * Illustrative average time to brute-force, assuming the attacker knows the
 * generator settings and tests `guessesPerSecond` candidates per second.
 */
export function describeCrackTime(bits: number, guessesPerSecond = 1e11): string {
  // average = half the space
  const log10Seconds = (bits - 1) * Math.LOG10E * Math.LN2 - Math.log10(guessesPerSecond);
  const units: [number, string][] = [
    [Math.log10(60), 'seconds'],
    [Math.log10(3600), 'minutes'],
    [Math.log10(86400), 'hours'],
    [Math.log10(86400 * 365.25), 'days'],
  ];
  if (log10Seconds < 0) return 'less than a second';
  const secs = 10 ** log10Seconds;
  if (log10Seconds < units[0][0]) return `about ${Math.round(secs)} seconds`;
  if (log10Seconds < units[1][0]) return `about ${Math.round(secs / 60)} minutes`;
  if (log10Seconds < units[2][0]) return `about ${Math.round(secs / 3600)} hours`;
  if (log10Seconds < units[3][0]) return `about ${Math.round(secs / 86400)} days`;
  const log10Years = log10Seconds - units[3][0];
  if (log10Years < 3) return `about ${Math.round(10 ** log10Years)} years`;
  if (log10Years < 6) return `about ${Math.round(10 ** (log10Years - 3))} thousand years`;
  if (log10Years < 9) return `about ${Math.round(10 ** (log10Years - 6))} million years`;
  if (log10Years < 12) return `about ${Math.round(10 ** (log10Years - 9))} billion years`;
  return `more than 10^${Math.floor(log10Years)} years`;
}
