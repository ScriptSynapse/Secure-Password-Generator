import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DEFAULT_PASSPHRASE_OPTIONS, generatePassphrase, validatePassphraseOptions } from '../../src/lib/passphrase';
import { WORDLIST, WORDLIST_SHA256 } from '../../src/lib/wordlist';

describe('word list', () => {
  test('has 7776 unique lowercase words', () => {
    assert.equal(WORDLIST.length, 7776);
    assert.equal(new Set(WORDLIST).size, 7776);
    assert.ok(WORDLIST.every((w) => /^[a-z]{4,7}$/.test(w)));
  });

  test('matches the recorded checksum', () => {
    assert.equal(createHash('sha256').update(WORDLIST.join('\n')).digest('hex'), WORDLIST_SHA256);
  });
});

describe('generatePassphrase', () => {
  test('defaults: 6 hyphen-separated list words', () => {
    const p = generatePassphrase({ ...DEFAULT_PASSPHRASE_OPTIONS }, WORDLIST);
    const parts = p.split('-');
    assert.equal(parts.length, 6);
    assert.ok(parts.every((w) => WORDLIST.includes(w)));
  });

  test('word count and separator are honoured', () => {
    for (const separator of ['-', '.', '_', ' ', ','] as const) {
      for (const words of [3, 7, 12]) {
        const p = generatePassphrase({ ...DEFAULT_PASSPHRASE_OPTIONS, words, separator }, WORDLIST);
        assert.equal(p.split(separator).length, words);
      }
    }
  });

  test('capitalisation and number options', () => {
    for (let i = 0; i < 100; i += 1) {
      const p = generatePassphrase({ ...DEFAULT_PASSPHRASE_OPTIONS, capitalize: true, includeNumber: true }, WORDLIST);
      const parts = p.split('-');
      assert.ok(parts.every((w) => /^[A-Z][a-z]+\d?$/.test(w)));
      assert.equal((p.match(/\d/g) ?? []).length, 1);
    }
  });

  test('outputs vary', () => {
    const s = new Set(Array.from({ length: 300 }, () => generatePassphrase({ ...DEFAULT_PASSPHRASE_OPTIONS }, WORDLIST)));
    assert.equal(s.size, 300);
  });

  test('validation', () => {
    assert.ok(validatePassphraseOptions({ ...DEFAULT_PASSPHRASE_OPTIONS, words: 2 }).length > 0);
    assert.ok(validatePassphraseOptions({ ...DEFAULT_PASSPHRASE_OPTIONS, words: 13 }).length > 0);
    assert.throws(() => generatePassphrase({ ...DEFAULT_PASSPHRASE_OPTIONS, words: 2 }, WORDLIST), RangeError);
    assert.throws(() => generatePassphrase({ ...DEFAULT_PASSPHRASE_OPTIONS }, ['a', 'b']), RangeError);
  });
});
