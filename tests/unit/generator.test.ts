import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generatePassword, generateMany } from '../../src/lib/generator';
import {
  AMBIGUOUS,
  DEFAULT_OPTIONS,
  LOWERCASE,
  NUMBERS,
  PasswordOptionsError,
  SIMILAR,
  SYMBOLS,
  UPPERCASE,
  clampLength,
  planGeneration,
  sanitizeCustomSymbols,
  validateOptions,
} from '../../src/lib/passwordValidation';
import type { PasswordOptions } from '../../src/types/password';

const opts = (o: Partial<PasswordOptions> = {}): PasswordOptions => ({ ...DEFAULT_OPTIONS, ...o });
const has = (s: string, set: string) => Array.from(s).some((c) => set.includes(c));

describe('length', () => {
  test('default is 20', () => {
    assert.equal(DEFAULT_OPTIONS.length, 20);
    assert.equal(generatePassword(opts()).value.length, 20);
  });

  test('every length from 8 to 64 produces exactly that many characters', () => {
    for (let len = 8; len <= 64; len += 1) assert.equal(generatePassword(opts({ length: len })).value.length, len);
  });

  test('rejects out-of-range and non-integer lengths', () => {
    for (const length of [0, 7, 65, 1000, 12.5, Number.NaN]) {
      assert.throws(() => generatePassword(opts({ length })), PasswordOptionsError);
    }
  });

  test('clampLength normalises user input', () => {
    assert.equal(clampLength(3), 8);
    assert.equal(clampLength(99), 64);
    assert.equal(clampLength('17'), 17);
    assert.equal(clampLength('abc'), 20);
    assert.equal(clampLength(12.6), 13);
  });
});

describe('character categories', () => {
  test('requires at least one category', () => {
    const issues = validateOptions(opts({ uppercase: false, lowercase: false, numbers: false, symbols: false }));
    assert.ok(issues.some((i) => /at least one/i.test(i)));
  });

  test('single categories only use that category', () => {
    const cases: [Partial<PasswordOptions>, string][] = [
      [{ uppercase: true, lowercase: false, numbers: false, symbols: false }, UPPERCASE],
      [{ uppercase: false, lowercase: true, numbers: false, symbols: false }, LOWERCASE],
      [{ uppercase: false, lowercase: false, numbers: true, symbols: false }, NUMBERS],
      [{ uppercase: false, lowercase: false, numbers: false, symbols: true }, SYMBOLS],
    ];
    for (const [o, set] of cases) {
      for (let i = 0; i < 50; i += 1) {
        const p = generatePassword(opts(o)).value;
        assert.ok(Array.from(p).every((c) => set.includes(c)), `unexpected char in ${JSON.stringify(o)}`);
      }
    }
  });

  test('every selected category is represented, even at minimum length', () => {
    for (let i = 0; i < 500; i += 1) {
      const p = generatePassword(opts({ length: 8 })).value;
      assert.ok(has(p, UPPERCASE) && has(p, LOWERCASE) && has(p, NUMBERS) && has(p, SYMBOLS));
    }
  });

  test('categories are represented with tiny custom symbol sets', () => {
    for (let i = 0; i < 200; i += 1) {
      const p = generatePassword(opts({ length: 8, useCustomSymbols: true, customSymbols: '#' })).value;
      assert.ok(p.includes('#'));
      assert.ok(Array.from(p).every((c) => !SYMBOLS.includes(c) || c === '#'));
    }
  });
});

describe('exclusions', () => {
  test('exclude ambiguous removes every ambiguous symbol', () => {
    for (let i = 0; i < 300; i += 1) {
      const p = generatePassword(opts({ length: 64, excludeAmbiguous: true })).value;
      assert.ok(!has(p, AMBIGUOUS), 'found an ambiguous symbol');
    }
  });

  test('exclude similar removes look-alike characters', () => {
    for (let i = 0; i < 300; i += 1) {
      const p = generatePassword(opts({ length: 64, excludeSimilar: true })).value;
      assert.ok(!has(p, SIMILAR), 'found a look-alike character');
    }
  });

  test('exclusions that empty a category are reported, not silently ignored', () => {
    const issues = validateOptions(
      opts({ uppercase: false, lowercase: false, numbers: false, useCustomSymbols: true, customSymbols: '()<>', excludeAmbiguous: true }),
    );
    assert.ok(issues.length > 0);
  });
});

describe('custom symbols', () => {
  test('sanitizer keeps ASCII punctuation, dedupes, reports rejects', () => {
    const r = sanitizeCustomSymbols('!!a@ é#1 $');
    assert.equal(r.value, '!@#$');
    assert.deepEqual(r.rejected.sort(), [' ', '1', 'a', 'é'].sort());
  });

  test('only custom symbols are used', () => {
    for (let i = 0; i < 100; i += 1) {
      const p = generatePassword(opts({ useCustomSymbols: true, customSymbols: '@-' })).value;
      assert.ok(Array.from(p).every((c) => !SYMBOLS.includes(c) || '@-'.includes(c)));
    }
  });

  test('empty custom set is an error', () => {
    assert.throws(() => generatePassword(opts({ useCustomSymbols: true, customSymbols: 'abc' })), PasswordOptionsError);
  });
});

describe('repeat rules', () => {
  test('avoid consecutive: no adjacent repeats, even with a tiny pool', () => {
    for (let i = 0; i < 300; i += 1) {
      const p = generatePassword(opts({ length: 64, uppercase: false, lowercase: false, symbols: false, avoidConsecutive: true })).value;
      for (let j = 1; j < p.length; j += 1) assert.notEqual(p[j], p[j - 1]);
    }
  });

  test('avoid duplicates: all characters unique when feasible', () => {
    for (let i = 0; i < 200; i += 1) {
      const p = generatePassword(opts({ length: 40, avoidDuplicates: true })).value;
      assert.equal(new Set(p).size, p.length);
    }
  });

  test('avoid duplicates is relaxed with a notice when infeasible', () => {
    const plan = planGeneration(opts({ length: 20, uppercase: false, lowercase: false, symbols: false, avoidDuplicates: true }));
    assert.equal(plan.noDuplicates, false);
    assert.ok(plan.notices.some((n) => /paused/i.test(n)));
    assert.equal(generatePassword(plan.options).value.length, 20);
  });
});

describe('output variety', () => {
  test('consecutive generations differ', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i += 1) seen.add(generatePassword(opts()).value);
    assert.equal(seen.size, 1000);
  });

  test('generateMany returns independent passwords', () => {
    const list = generateMany(opts(), 50);
    assert.equal(list.length, 50);
    assert.equal(new Set(list).size, 50);
    assert.throws(() => generateMany(opts(), 0), RangeError);
    assert.throws(() => generateMany(opts(), 101), RangeError);
  });

  test('every pool character eventually appears (no stuck characters)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i += 1) for (const c of generatePassword(opts({ length: 64 })).value) seen.add(c);
    assert.equal(seen.size, 26 + 26 + 10 + 32);
  });
});

describe('errors never expose passwords', () => {
  test('error messages contain only option feedback', () => {
    try {
      generatePassword(opts({ length: 2 }));
      assert.fail('should throw');
    } catch (e) {
      assert.ok(e instanceof PasswordOptionsError);
      assert.match((e as Error).message, /Length must be/);
    }
  });
});
