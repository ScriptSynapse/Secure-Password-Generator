/**
 * Single source of truth for VaultKey's HTTP security policy.
 * Used by scripts/build.mjs (dist/_headers + <meta> CSP), scripts/preview.mjs,
 * and checked against vercel.json by the unit tests.
 */

/** Directives shared by the header and the <meta> fallback. */
const CSP_DIRECTIVES = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  // No fetch/XHR/WebSocket/beacon destinations at all: the page cannot send data anywhere.
  "connect-src 'none'",
  "manifest-src 'self'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
  'upgrade-insecure-requests',
];

/** Full policy for the HTTP header (frame-ancestors only works as a header). */
export const CSP_HEADER = [...CSP_DIRECTIVES, "frame-ancestors 'none'"].join('; ');

/** Policy for <meta http-equiv>, used as defence in depth if headers are missing. */
export const CSP_META = CSP_DIRECTIVES.join('; ');

export const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP_HEADER,
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), clipboard-read=(), clipboard-write=(self)',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

/** Cloudflare Pages `_headers` file contents. */
export function cloudflareHeadersFile() {
  const lines = ['/*'];
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) lines.push(`  ${k}: ${v}`);
  lines.push('', '/assets/*', `  Cache-Control: ${IMMUTABLE_CACHE}`, '', '/fonts/*', `  Cache-Control: ${IMMUTABLE_CACHE}`, '');
  return lines.join('\n');
}
