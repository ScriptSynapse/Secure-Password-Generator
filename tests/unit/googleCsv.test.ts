import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleCsv, csvField, normalizeSite, CSV_HEADER, GOOGLE_IMPORT_LIMIT } from '../../src/lib/googleCsv';

/** Minimal RFC 4180 parser to round-trip what we generate. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        f += '"';
        i += 1;
      } else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(f);
      f = '';
    } else if (c === '\n') {
      row.push(f.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      f = '';
    } else f += c;
  }
  return rows;
}

describe('normalizeSite', () => {
  test('adds https and keeps origin + path', () => {
    assert.deepEqual(normalizeSite('github.com'), { ok: true, url: 'https://github.com/', name: 'github.com' });
    assert.deepEqual(normalizeSite(' https://www.example.org/login '), { ok: true, url: 'https://www.example.org/login', name: 'example.org' });
  });

  test('drops query strings and fragments (may contain tokens)', () => {
    const r = normalizeSite('https://site.com/signin?token=abc#frag');
    assert.ok(r.ok && r.url === 'https://site.com/signin');
  });

  test('rejects unsafe or invalid input', () => {
    for (const bad of ['', '   ', 'javascript:alert(1)', 'ftp://x.com', 'not a site', 'intranet', 'https://user:pw@x.com', 'data:text/html,hi']) {
      assert.equal(normalizeSite(bad).ok, false, bad);
    }
  });
});

describe('buildGoogleCsv', () => {
  test('uses Chrome’s export header and round-trips awkward characters exactly', () => {
    const entries = [
      { name: 'github.com', url: 'https://github.com/', username: 'me@example.com', password: 'a"b,c\nd=1+2', note: 'from VaultKey' },
      { name: 'x.com', url: 'https://x.com/', username: '', password: '=SUM(A1)', note: '' },
    ];
    const csv = buildGoogleCsv(entries);
    assert.ok(csv.startsWith(CSV_HEADER + '\r\n'));
    const rows = parseCsv(csv);
    assert.deepEqual(rows[0], ['name', 'url', 'username', 'password', 'note']);
    assert.deepEqual(rows[1], ['github.com', 'https://github.com/', 'me@example.com', 'a"b,c\nd=1+2', 'from VaultKey']);
    assert.deepEqual(rows[2], ['x.com', 'https://x.com/', '', '=SUM(A1)', '']);
  });

  test('csvField quotes and escapes', () => {
    assert.equal(csvField('he said "hi"'), '"he said ""hi"""');
  });

  test('enforces Google’s per-import limit', () => {
    const e = { name: 'a.com', url: 'https://a.com/', username: '', password: 'p', note: '' };
    assert.doesNotThrow(() => buildGoogleCsv(Array(GOOGLE_IMPORT_LIMIT).fill(e)));
    assert.throws(() => buildGoogleCsv(Array(GOOGLE_IMPORT_LIMIT + 1).fill(e)), RangeError);
  });
});
