import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  countPossiblePasswords,
  describeCrackTime,
  log2BigInt,
  passphraseEntropyBits,
  planEntropyBits,
  strengthFromBits,
} from '../../src/lib/passwordStrength';
import { DEFAULT_OPTIONS, planGeneration } from '../../src/lib/passwordValidation';

/** Brute-force count for tiny alphabets to verify the inclusion–exclusion formula. */
function brute(sizes: number[], len: number, mode: 'free' | 'noConsecutive' | 'noDuplicates'): number {
  const cat: number[] = sizes.flatMap((s, ci) => Array(s).fill(ci));
  const m = cat.length;
  let count = 0;
  const cur: number[] = [];
  const rec = () => {
    if (cur.length === len) {
      const cats = new Set(cur.map((x) => cat[x]));
      if (cats.size === sizes.length) count += 1;
      return;
    }
    for (let x = 0; x < m; x += 1) {
      if (mode === 'noConsecutive' && cur.length && cur[cur.length - 1] === x) continue;
      if (mode === 'noDuplicates' && cur.includes(x)) continue;
      cur.push(x);
      rec();
      cur.pop();
    }
  };
  rec();
  return count;
}

describe('exact password counting', () => {
  for (const mode of ['free', 'noConsecutive', 'noDuplicates'] as const) {
    test(`matches brute force (${mode})`, () => {
      for (const sizes of [[2], [2, 1], [3, 2], [2, 2, 1], [1, 1, 2, 2]]) {
        for (let len = 1; len <= 5; len += 1) {
          assert.equal(Number(countPossiblePasswords(sizes, len, mode)), brute(sizes, len, mode), `${mode} ${sizes} ${len}`);
        }
      }
    });
  }
});

describe('entropy', () => {
  test('log2BigInt is accurate for huge values', () => {
    assert.equal(log2BigInt(1n << 300n), 300);
    assert.ok(Math.abs(log2BigInt(94n ** 64n) - 64 * Math.log2(94)) < 1e-9);
  });

  test('default settings (20 chars, 94-char pool) ≈ 131 bits, slightly below the 20·log2(94) upper bound', () => {
    const bits = planEntropyBits(planGeneration({ ...DEFAULT_OPTIONS }));
    const upper = 20 * Math.log2(94);
    assert.ok(bits < upper && bits > upper - 1, `got ${bits}`);
  });

  test('digits only, 8 chars ≈ 26.6 bits → Very Weak', () => {
    const plan = planGeneration({ ...DEFAULT_OPTIONS, length: 8, uppercase: false, lowercase: false, symbols: false });
    const bits = planEntropyBits(plan);
    assert.ok(Math.abs(bits - 8 * Math.log2(10)) < 1e-9);
    assert.equal(strengthFromBits(bits).label, 'Very Weak');
  });

  test('strength bands', () => {
    assert.equal(strengthFromBits(20).label, 'Very Weak');
    assert.equal(strengthFromBits(30).label, 'Weak');
    assert.equal(strengthFromBits(50).label, 'Moderate');
    assert.equal(strengthFromBits(70).label, 'Strong');
    assert.equal(strengthFromBits(128).label, 'Very Strong');
  });

  test('passphrase entropy', () => {
    assert.ok(Math.abs(passphraseEntropyBits(6, 7776, false) - 6 * Math.log2(7776)) < 1e-9);
    assert.ok(passphraseEntropyBits(6, 7776, true) > passphraseEntropyBits(6, 7776, false));
  });

  test('crack-time description is monotonic and readable', () => {
    assert.equal(describeCrackTime(10), 'less than a second');
    assert.match(describeCrackTime(60), /years|days|hours/);
    assert.match(describeCrackTime(200), /more than 10\^/);
  });
});
