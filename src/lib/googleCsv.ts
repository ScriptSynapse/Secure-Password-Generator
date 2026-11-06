/**
 * Google Password Manager export.
 *
 * Websites cannot write into Google Password Manager directly (there is no public API,
 * and the browser's Credential Management API would only save a password for VaultKey's
 * own domain). Google Password Manager does, however, import .csv files. This module
 * builds a file in the same format Chrome uses for its own exports:
 *
 *   name,url,username,password,note
 *
 * Google requires the url, username and password columns and accepts up to 3,000
 * passwords per import. Everything happens in memory; nothing is uploaded.
 */

export const GOOGLE_IMPORT_LIMIT = 3000;
export const GOOGLE_PM_URL = 'https://passwords.google.com/options?ep=1';
export const CSV_HEADER = 'name,url,username,password,note';

export interface GoogleEntry {
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
 * contain session tokens and Google matches on the site, not the full address.
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

export function buildGoogleCsv(entries: readonly Pick<GoogleEntry, 'name' | 'url' | 'username' | 'password' | 'note'>[]): string {
  if (entries.length > GOOGLE_IMPORT_LIMIT) {
    throw new RangeError(`Google Password Manager imports at most ${GOOGLE_IMPORT_LIMIT} passwords per file.`);
  }
  const rows = entries.map((e) => [e.name, e.url, e.username, e.password, e.note].map(csvField).join(','));
  return [CSV_HEADER, ...rows].join('\r\n') + '\r\n';
}
