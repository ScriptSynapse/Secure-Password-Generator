export type CharCategory = 'uppercase' | 'lowercase' | 'numbers' | 'symbols';

export interface PasswordOptions {
  /** Integer, 8–64 inclusive. */
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  /** Drop symbols that are easy to confuse or hard to type: { } [ ] ( ) / \ ' " ` ~ , ; : . < > */
  excludeAmbiguous: boolean;
  /** Drop look-alike characters: i I l L 1 | o O 0 */
  excludeSimilar: boolean;
  /** When true, `customSymbols` replaces the default symbol set. */
  useCustomSymbols: boolean;
  customSymbols: string;
  /** Never place the same character twice in a row. */
  avoidConsecutive: boolean;
  /** Use each character at most once, when the pool is large enough. */
  avoidDuplicates: boolean;
}

export interface CharsetBuild {
  /** Characters available per enabled category, after exclusions. Disjoint. */
  categories: { id: CharCategory; chars: string[] }[];
  /** Union of all enabled category characters. */
  pool: string[];
}

export interface GenerationPlan {
  options: PasswordOptions;
  charset: CharsetBuild;
  /** Effective rules after feasibility checks. */
  noDuplicates: boolean;
  noConsecutive: boolean;
  /** Human-readable notes about restrictions that were relaxed or applied. */
  notices: string[];
}

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface StrengthResult {
  level: StrengthLevel;
  label: 'Very Weak' | 'Weak' | 'Moderate' | 'Strong' | 'Very Strong';
  bits: number;
}

export interface PassphraseOptions {
  /** 3–12 words. */
  words: number;
  separator: '-' | '.' | '_' | ' ' | ',';
  capitalize: boolean;
  includeNumber: boolean;
}
