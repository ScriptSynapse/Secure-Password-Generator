/**
 * "Save in your browser" helpers.
 *
 * A website cannot write into the browser's password manager for another site: browsers
 * only offer to save a password when the user submits that site's own form. VaultKey
 * therefore offers two honest routes:
 *
 *  1. Guided save — copy the password and open the site; the browser offers to save it
 *     when the user signs up / changes their password there, and syncs it to the user's
 *     other devices running the same browser.
 *  2. Transfer file — one .csv with the header used by Chromium browsers' own exports:
 *
 *       name,url,username,password,note
 *
 *     Chrome, Edge, Firefox and Apple Passwords all import this format, so the same
 *     logins can be added to any browser. Everything happens in memory; nothing is uploaded.
 */

/** Kept well within every browser's import limits. */
export const IMPORT_LIMIT = 3000;
export const CSV_HEADER = 'name,url,username,password,note';

export interface LoginEntry {
  id: number;
  /** Display name, defaults to the site's hostname. */
  name: string;
  /** Normalised https URL (origin + path, never query string or fragment). */
  url: string;
  username: string;
  password: string;
  note: string;
}

export type SiteResult = { ok: true; url: string; name: string } | { ok: false; error: string };

/**
 * Turn what a user types ("github.com", "https://example.org/login?x=1") into a clean URL.
 * Only http(s) is allowed. Query strings and fragments are dropped because they can
 * contain session tokens, and password managers match on the site, not the full address.
 */
export function normalizeSite(input: string): SiteResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: 'Enter the website this password is for.' };
  if (raw.length > 2048) return { ok: false, error: 'That address is too long.' };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, error: 'That doesn’t look like a website address.' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, error: 'Only http:// and https:// websites are supported.' };
  const host = u.hostname;
  if (!host || (!host.includes('.') && host !== 'localhost') || /\s/.test(host)) {
    return { ok: false, error: 'Enter a full domain, for example github.com.' };
  }
  if (u.username || u.password) return { ok: false, error: 'Don’t include a username or password in the address.' };
  const path = u.pathname === '/' ? '/' : u.pathname;
  return { ok: true, url: `${u.origin}${path}`, name: host.replace(/^www\./, '') };
}

/** RFC 4180 field: always quoted, embedded quotes doubled. */
export function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildImportCsv(entries: readonly Pick<LoginEntry, 'name' | 'url' | 'username' | 'password' | 'note'>[]): string {
  if (entries.length > IMPORT_LIMIT) {
    throw new RangeError(`A single import file can hold at most ${IMPORT_LIMIT} passwords.`);
  }
  const rows = entries.map((e) => [e.name, e.url, e.username, e.password, e.note].map(csvField).join(','));
  return [CSV_HEADER, ...rows].join('\r\n') + '\r\n';
}

export type BrowserId = 'chrome' | 'edge' | 'firefox' | 'safari';

/** Best-effort guess of the current browser, used only to pre-select instructions. */
export function detectBrowser(ua: string): BrowserId {
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'chrome';
}
