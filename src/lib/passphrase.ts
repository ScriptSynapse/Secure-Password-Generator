import type { PassphraseOptions } from '../types/password';
import { secureRandomInt } from './crypto';

export const MIN_WORDS = 3;
export const MAX_WORDS = 12;

export const DEFAULT_PASSPHRASE_OPTIONS: Readonly<PassphraseOptions> = Object.freeze({
  words: 6,
  separator: '-',
  capitalize: false,
  includeNumber: false,
});

export const SEPARATORS: { value: PassphraseOptions['separator']; label: string }[] = [
  { value: '-', label: 'Hyphen' },
  { value: '.', label: 'Period' },
  { value: '_', label: 'Underscore' },
  { value: ',', label: 'Comma' },
  { value: ' ', label: 'Space' },
];

export function validatePassphraseOptions(o: PassphraseOptions): string[] {
  const issues: string[] = [];
  if (!Number.isInteger(o.words) || o.words < MIN_WORDS || o.words > MAX_WORDS) {
    issues.push(`Word count must be between ${MIN_WORDS} and ${MAX_WORDS}.`);
  }
  if (!SEPARATORS.some((s) => s.value === o.separator)) issues.push('Choose a supported separator.');
  return issues;
}

/**
 * Diceware-style passphrase: each word is chosen independently and uniformly from the
 * word list with the CSPRNG. Capitalisation is deterministic (first letter of each word)
 * and adds no entropy. "Include a number" appends one random digit to one randomly
 * chosen word, adding log2(10 · words) bits.
 */
export function generatePassphrase(o: PassphraseOptions, list: readonly string[]): string {
  const issues = validatePassphraseOptions(o);
  if (issues.length) throw new RangeError(issues.join(' '));
  if (list.length < 1024) throw new RangeError('Word list is too small.');
  const words: string[] = [];
  for (let i = 0; i < o.words; i += 1) {
    let w = list[secureRandomInt(list.length)];
    if (o.capitalize) w = w.charAt(0).toUpperCase() + w.slice(1);
    words.push(w);
  }
  if (o.includeNumber) {
    const at = secureRandomInt(words.length);
    words[at] = words[at] + String(secureRandomInt(10));
  }
  const out = words.join(o.separator);
  words.fill('');
  return out;
}
