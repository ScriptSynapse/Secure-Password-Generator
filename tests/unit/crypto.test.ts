import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { secureRandomInt, secureShuffle, secureChoice, wipeRandomBuffer, CryptoUnavailableError } from '../../src/lib/crypto';
import { generatePassword } from '../../src/lib/generator';
import { DEFAULT_OPTIONS } from '../../src/lib/passwordValidation';

const realGRV = globalThis.crypto.getRandomValues.bind(globalThis.crypto);

afterEach(() => {
  globalThis.crypto.getRandomValues = realGRV;
  wipeRandomBuffer();
});

describe('secureRandomInt', () => {
  test('stays within bounds for many ranges', () => {
    for (const n of [1, 2, 3, 7, 10, 26, 62, 94, 255, 7776, 2 ** 31 + 1]) {
      for (let i = 0; i < 2000; i += 1) {
        const v = secureRandomInt(n);
        assert.ok(Number.isInteger(v) && v >= 0 && v < n, `out of range for n=${n}: ${v}`);
      }
    }
  });

  test('rejects invalid ranges', () => {
    for (const bad of [0, -1, 1.5, Number.NaN, 2 ** 32 + 1]) assert.throws(() => secureRandomInt(bad), RangeError);
  });

  test('is approximately uniform (chi-square, n=94, 188k draws)', () => {
    const n = 94;
    const draws = 188_000;
    const counts = new Array(n).fill(0);
    for (let i = 0; i < draws; i += 1) counts[secureRandomInt(n)] += 1;
    const expected = draws / n;
    const chi = counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
    // df = 93; P(chi2 > 160) ≈ 1e-5. A failure here indicates real bias, not bad luck.
    assert.ok(chi < 160, `chi-square too high: ${chi.toFixed(1)}`);
  });

  test('uses rejection sampling: values above the largest multiple are discarded (no modulo bias)', () => {
    // For n = 3, limit = 2^32 - (2^32 % 3) = 4294967295. Feed the rejected value first.
    const queue = [4294967295, 5];
    globalThis.crypto.getRandomValues = (<T extends ArrayBufferView | null>(arr: T): T => {
      const u = arr as unknown as Uint32Array;
      for (let i = 0; i < u.length; i += 1) u[i] = queue.length ? (queue.shift() as number) : 0;
      return arr;
    }) as typeof globalThis.crypto.getRandomValues;
    wipeRandomBuffer();
    assert.equal(secureRandomInt(3), 5 % 3);
  });
});

describe('randomness source', () => {
  test('password generation calls crypto.getRandomValues', () => {
    let calls = 0;
    globalThis.crypto.getRandomValues = (<T extends ArrayBufferView | null>(arr: T): T => {
      calls += 1;
      return realGRV(arr as never) as T;
    }) as typeof globalThis.crypto.getRandomValues;
    wipeRandomBuffer();
    generatePassword({ ...DEFAULT_OPTIONS });
    assert.ok(calls > 0, 'getRandomValues was never called');
  });

  test('password generation never calls Math.random', () => {
    const original = Math.random;
    let used = false;
    Math.random = () => {
      used = true;
      return original();
    };
    try {
      for (let i = 0; i < 50; i += 1) generatePassword({ ...DEFAULT_OPTIONS, avoidConsecutive: i % 2 === 0 });
      generatePassword({ ...DEFAULT_OPTIONS, avoidDuplicates: true });
    } finally {
      Math.random = original;
    }
    assert.equal(used, false);
  });

  test('fails closed when Web Crypto is unavailable', () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    wipeRandomBuffer();
    try {
      assert.throws(() => secureRandomInt(10), CryptoUnavailableError);
    } finally {
      if (desc) Object.defineProperty(globalThis, 'crypto', desc);
    }
  });
});

describe('secureShuffle / secureChoice', () => {
  test('shuffle is a permutation', () => {
    const src = Array.from({ length: 50 }, (_, i) => i);
    const out = secureShuffle(src.slice());
    assert.deepEqual(out.slice().sort((a, b) => a - b), src);
  });

  test('every position receives every element over many shuffles', () => {
    const seen = Array.from({ length: 5 }, () => new Set<number>());
    for (let t = 0; t < 2000; t += 1) secureShuffle([0, 1, 2, 3, 4]).forEach((v, i) => seen[i].add(v));
    seen.forEach((s) => assert.equal(s.size, 5));
  });

  test('choice rejects empty input', () => {
    assert.throws(() => secureChoice([]), RangeError);
  });
});
