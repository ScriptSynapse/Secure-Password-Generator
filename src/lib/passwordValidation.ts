import type { CharCategory, CharsetBuild, GenerationPlan, PasswordOptions } from '../types/password';

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 64;

export const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
export const NUMBERS = '0123456789';
/** All 32 printable ASCII punctuation characters. */
export const SYMBOLS = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
/** Symbols that are easy to confuse, or awkward in shells, URLs, CSV and some forms. */
export const AMBIGUOUS = '{}[]()/\\\'"`~,;:.<>';
/** Characters that look alike in many fonts. */
export const SIMILAR = 'iIlL1|oO0';

export const DEFAULT_OPTIONS: Readonly<PasswordOptions> = Object.freeze({
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
  excludeSimilar: false,
  useCustomSymbols: false,
  customSymbols: '!@#$%^&*-_=+?',
  avoidConsecutive: false,
  avoidDuplicates: false,
});

export const CATEGORY_LABELS: Record<CharCategory, string> = {
  uppercase: 'Uppercase',
  lowercase: 'Lowercase',
  numbers: 'Numbers',
  symbols: 'Symbols',
};

export class PasswordOptionsError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'PasswordOptionsError';
    this.issues = issues;
  }
}

/** Clamp and round arbitrary input to a valid length. */
export function clampLength(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return DEFAULT_OPTIONS.length;
  return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.round(n)));
}

/**
 * Normalise a user-typed custom symbol string: keep only ASCII punctuation,
 * drop duplicates, preserve first-seen order. Returns the cleaned string and
 * any characters that were rejected.
 */
export function sanitizeCustomSymbols(input: string): { value: string; rejected: string[] } {
  const out: string[] = [];
  const rejected: string[] = [];
  for (const ch of Array.from(input.slice(0, 200))) {
    if (SYMBOLS.includes(ch)) {
      if (!out.includes(ch)) out.push(ch);
    } else if (!rejected.includes(ch)) {
      rejected.push(ch);
    }
  }
  return { value: out.join(''), rejected };
}

function filterChars(chars: string, opts: PasswordOptions): string[] {
  return Array.from(new Set(Array.from(chars))).filter(
    (c) => !(opts.excludeAmbiguous && AMBIGUOUS.includes(c)) && !(opts.excludeSimilar && SIMILAR.includes(c)),
  );
}

export function buildCharset(opts: PasswordOptions): CharsetBuild {
  const symbolSource = opts.useCustomSymbols ? sanitizeCustomSymbols(opts.customSymbols).value : SYMBOLS;
  const all: { id: CharCategory; enabled: boolean; src: string }[] = [
    { id: 'uppercase', enabled: opts.uppercase, src: UPPERCASE },
    { id: 'lowercase', enabled: opts.lowercase, src: LOWERCASE },
    { id: 'numbers', enabled: opts.numbers, src: NUMBERS },
    { id: 'symbols', enabled: opts.symbols, src: symbolSource },
  ];
  const categories = all.filter((c) => c.enabled).map((c) => ({ id: c.id, chars: filterChars(c.src, opts) }));
  const pool = categories.flatMap((c) => c.chars);
  return { categories, pool };
}

/** Returns a list of human-readable problems; empty means the options are usable. */
export function validateOptions(opts: PasswordOptions): string[] {
  const issues: string[] = [];
  if (!Number.isInteger(opts.length) || opts.length < MIN_LENGTH || opts.length > MAX_LENGTH) {
    issues.push(`Length must be a whole number between ${MIN_LENGTH} and ${MAX_LENGTH}.`);
  }
  if (!opts.uppercase && !opts.lowercase && !opts.numbers && !opts.symbols) {
    issues.push('Select at least one character type.');
  }
  if (opts.symbols && opts.useCustomSymbols && sanitizeCustomSymbols(opts.customSymbols).value.length === 0) {
    issues.push('Your custom symbol set is empty. Add at least one symbol, or turn off custom symbols.');
  }
  const { categories } = buildCharset(opts);
  for (const c of categories) {
    if (c.chars.length === 0 && !issues.some((i) => i.startsWith('Your custom symbol'))) {
      issues.push(`The current exclusions remove every ${CATEGORY_LABELS[c.id].toLowerCase()} character.`);
    }
  }
  if (Number.isInteger(opts.length) && categories.length > opts.length) {
    issues.push('Length is too short to include every selected character type.');
  }
  return issues;
}

/** Validate options and work out which optional rules can actually be honoured. */
export function planGeneration(opts: PasswordOptions): GenerationPlan {
  const issues = validateOptions(opts);
  if (issues.length) throw new PasswordOptionsError(issues);
  const charset = buildCharset(opts);
  const notices: string[] = [];
  const size = charset.pool.length;

  let noDuplicates = opts.avoidDuplicates;
  if (noDuplicates && size < opts.length) {
    noDuplicates = false;
    notices.push(
      `“Avoid duplicates” is paused: only ${size} characters are available, fewer than the ${opts.length} needed. Some characters will repeat.`,
    );
  }
  let noConsecutive = opts.avoidConsecutive || noDuplicates;
  if (noConsecutive && size < 2) {
    noConsecutive = false;
    notices.push('“Avoid consecutive repeats” is paused: at least two distinct characters are needed.');
  }
  if (opts.excludeAmbiguous) notices.push('Ambiguous symbols removed: { } [ ] ( ) / \\ \' " ` ~ , ; : . < >');
  if (opts.excludeSimilar) notices.push('Look-alike characters removed: i I l L 1 | o O 0');
  if (opts.symbols && opts.useCustomSymbols) {
    const sym = charset.categories.find((c) => c.id === 'symbols');
    notices.push(`Symbols limited to your custom set (${sym?.chars.length ?? 0} usable).`);
  }
  if (noDuplicates) notices.push('Each character is used at most once.');
  else if (noConsecutive) notices.push('No character appears twice in a row.');
  if (charset.categories.length > 1) notices.push('Every selected character type is guaranteed to appear at least once.');

  return { options: { ...opts }, charset, noDuplicates, noConsecutive, notices };
}
