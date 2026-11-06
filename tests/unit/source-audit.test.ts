/**
 * Static security audit of the source tree. These checks enforce VaultKey's
 * privacy guarantees at the code level: no weak randomness, no network calls,
 * no persistence APIs, no logging, no raw HTML rendering.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { CSP_HEADER, SECURITY_HEADERS } from '../../scripts/security.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });
}
const SRC = files(path.join(ROOT, 'src')).filter((f) => !f.endsWith('wordlist.ts'));

/**
 * Walk each file's TypeScript AST and collect identifiers / property accesses that are
 * actually used in code (prose that merely mentions an API in a string or JSX text is ignored).
 */
function apiUses(file: string): Set<string> {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const used = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n)) used.add(n.text);
    if (ts.isPropertyAccessExpression(n)) used.add(`${n.expression.getText(sf)}.${n.name.text}`);
    if (ts.isJsxAttribute(n)) used.add(`jsx:${n.name.getText(sf)}`);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return used;
}
const USES = new Map(SRC.map((f) => [path.relative(ROOT, f), apiUses(f)]));
const filesUsing = (pred: (u: Set<string>) => boolean) => [...USES].filter(([, u]) => pred(u)).map(([f]) => f);
const anyOf = (...names: string[]) => (u: Set<string>) => names.some((n) => u.has(n)) || [...u].some((x) => names.some((n) => x.endsWith(`.${n}`) && n.includes('.')));

const FORBIDDEN: [string, (u: Set<string>) => boolean][] = [
  ['Math.random', anyOf('Math.random')],
  ['console logging', (u) => [...u].some((x) => /^console\./.test(x))],
  ['localStorage / sessionStorage / indexedDB', anyOf('localStorage', 'sessionStorage', 'indexedDB')],
  ['cookies', (u) => [...u].some((x) => x.endsWith('.cookie'))],
  ['fetch / XMLHttpRequest / sendBeacon / WebSocket / EventSource', (u) => ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].some((n) => u.has(n)) || [...u].some((x) => x.endsWith('.sendBeacon'))],
  ['dangerouslySetInnerHTML / innerHTML / outerHTML', (u) => u.has('jsx:dangerouslySetInnerHTML') || [...u].some((x) => /\.(innerHTML|outerHTML|insertAdjacentHTML)$/.test(x))],
  ['eval / Function constructor', (u) => u.has('eval') || u.has('Function')],
  ['URL query strings', (u) => u.has('URLSearchParams') || [...u].some((x) => x.endsWith('.search') || x.endsWith('.searchParams'))],
];

describe('source audit (AST-based)', () => {
  test('audit sees real API usage (sanity check)', () => {
    assert.ok(USES.get(path.join('src', 'lib', 'crypto.ts'))?.has('getRandomValues'));
  });
  for (const [name, pred] of FORBIDDEN) {
    test(`no ${name} in src/`, () => assert.deepEqual(filesUsing(pred), []));
  }
  test('crypto.getRandomValues is only called from src/lib/crypto.ts', () => {
    assert.deepEqual(filesUsing((u) => u.has('getRandomValues')), [path.join('src', 'lib', 'crypto.ts')]);
  });
  test('only react and react-dom are runtime dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['react', 'react-dom']);
  });
});

describe('deployment security config', () => {
  test('CSP blocks all scripted network requests and framing', () => {
    assert.match(CSP_HEADER, /connect-src 'none'/);
    assert.match(CSP_HEADER, /default-src 'none'/);
    assert.match(CSP_HEADER, /frame-ancestors 'none'/);
    assert.match(CSP_HEADER, /script-src 'self'(;|$)/);
    assert.doesNotMatch(CSP_HEADER, /unsafe-inline|unsafe-eval|\*/);
  });

  test('vercel.json headers match scripts/security.mjs', () => {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    const hs = Object.fromEntries(v.headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]));
    assert.deepEqual(hs, SECURITY_HEADERS);
  });
});
