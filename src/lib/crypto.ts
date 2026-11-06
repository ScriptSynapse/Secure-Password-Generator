/**
 * Cryptographic randomness primitives.
 *
 * Every random decision in VaultKey goes through `secureRandomInt`, which reads
 * from the browser's CSPRNG via `crypto.getRandomValues()` and maps the output
 * onto [0, n) with rejection sampling, so there is no modulo bias.
 *
 * Math.random(), timestamps and seeded PRNGs are never used for secrets.
 */

export class CryptoUnavailableError extends Error {
  constructor() {
    super(
      'Secure random number generation is not available in this browser. ' +
        'VaultKey needs the Web Crypto API (crypto.getRandomValues) and will not fall back to weaker randomness.',
    );
    this.name = 'CryptoUnavailableError';
  }
}

const UINT32_RANGE = 0x1_0000_0000; // 2^32
const BUFFER_WORDS = 256;

let buffer: Uint32Array<ArrayBuffer> | null = null;
let cursor = BUFFER_WORDS;

function getCrypto(): Crypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c || typeof c.getRandomValues !== 'function') throw new CryptoUnavailableError();
  return c;
}

/** True when the Web Crypto CSPRNG is available. */
export function isSecureRandomAvailable(): boolean {
  try {
    getCrypto();
    return true;
  } catch {
    return false;
  }
}

/** Next uniformly random 32-bit unsigned integer from the CSPRNG. */
export function randomUint32(): number {
  if (!buffer || cursor >= BUFFER_WORDS) {
    buffer = buffer ?? new Uint32Array(BUFFER_WORDS);
    getCrypto().getRandomValues(buffer);
    cursor = 0;
  }
  const v = buffer[cursor];
  buffer[cursor] = 0; // don't keep consumed randomness around
  cursor += 1;
  return v;
}

/**
 * Uniform integer in [0, maxExclusive) using rejection sampling.
 *
 * We accept a 32-bit draw only if it falls below the largest multiple of
 * `maxExclusive` that fits in 2^32; anything above is discarded and redrawn.
 * Every accepted value maps onto the range the same number of times, so the
 * result is exactly uniform. Worst-case rejection probability is < 50%.
 */
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new RangeError('secureRandomInt: maxExclusive must be an integer in [1, 2^32].');
  }
  if (maxExclusive === 1) return 0;
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  for (;;) {
    const x = randomUint32();
    if (x < limit) return x % maxExclusive;
  }
}

/** Uniformly random element of a non-empty array. */
export function secureChoice<T>(items: readonly T[]): T {
  if (items.length === 0) throw new RangeError('secureChoice: empty input.');
  return items[secureRandomInt(items.length)];
}

/** In-place Fisher–Yates shuffle driven by the CSPRNG. Returns the same array. */
export function secureShuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

/** Discard any buffered random words (used when clearing sensitive state). */
export function wipeRandomBuffer(): void {
  if (buffer) buffer.fill(0);
  cursor = BUFFER_WORDS;
}
