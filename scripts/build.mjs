#!/usr/bin/env node
/**
 * Production build for VaultKey.
 *
 *  - Bundles src/main.tsx with esbuild (ESM, code-split, minified, content-hashed).
 *  - Compiles Tailwind CSS v4 through its Node API, scanning src/ for class candidates.
 *  - Writes one pre-rendered HTML shell per route (unique <title>/meta for SEO), a 404 page,
 *    robots.txt, sitemap.xml (when SITE_URL is set) and Cloudflare Pages `_headers`.
 *
 * Usage:  node scripts/build.mjs            (production → dist/)
 *         import { buildAll } from './build.mjs'   (used by scripts/dev.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { compile } from 'tailwindcss';
import { CSP_META, cloudflareHeadersFile } from './security.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');
const ROUTES = JSON.parse(fs.readFileSync(path.join(SRC, 'config/routes.json'), 'utf8'));

const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function walk(dir, exts) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
}

/** Collect Tailwind class candidates from source files (simple, conservative tokenizer). */
function scanCandidates() {
  const set = new Set();
  for (const file of walk(SRC, ['.ts', '.tsx', '.html'])) {
    if (file.endsWith('wordlist.ts')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const tok of text.split(/[\s"'`]+/)) {
      const t = tok.replace(/^[{(,;]+|[,;})]+$/g, '');
      if (t && t.length < 120 && /^[!-~]+$/.test(t)) set.add(t);
    }
  }
  return [...set];
}

export async function buildCss({ minify }) {
  const twDir = path.dirname(fileURLToPath(import.meta.resolve('tailwindcss/package.json')));
  const entry = path.join(SRC, 'styles/globals.css');
  const compiler = await compile(fs.readFileSync(entry, 'utf8'), {
    base: path.dirname(entry),
    loadStylesheet: async (id, base) => {
      const file = id === 'tailwindcss' ? path.join(twDir, 'index.css') : id.startsWith('tailwindcss/') ? path.join(twDir, id.slice(12)) : path.resolve(base, id);
      return { path: file, base: path.dirname(file), content: fs.readFileSync(file, 'utf8') };
    },
  });
  const css = compiler.build(scanCandidates());
  const out = await esbuild.transform(css, { loader: 'css', minify, target: ['chrome111', 'safari16.4', 'firefox128'] });
  return out.code;
}

function htmlShell({ route, meta, scripts, styles, preloads, siteUrl, dev }) {
  const url = siteUrl ? `${siteUrl}${route === '/' ? '/' : route}` : '';
  const isIndexable = route !== '/404';
  const jsonLd =
    route === '/'
      ? `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'VaultKey',
          description: ROUTES['/'].description,
          applicationCategory: 'SecurityApplication',
          operatingSystem: 'Any (modern web browser)',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          ...(siteUrl ? { url: `${siteUrl}/` } : {}),
        }).replace(/</g, '\\u003c')}</script>`
      : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${dev ? '' : `<meta http-equiv="Content-Security-Policy" content="${esc(CSP_META)}">\n`}<meta name="referrer" content="no-referrer">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
${isIndexable ? '' : '<meta name="robots" content="noindex">\n'}${url && isIndexable ? `<link rel="canonical" href="${esc(url)}">\n` : ''}<meta name="theme-color" content="#070A09">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="VaultKey">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
${url ? `<meta property="og:url" content="${esc(url)}">\n<meta property="og:image" content="${esc(siteUrl)}/og-image.png">\n` : '<meta property="og:image" content="/og-image.png">\n'}<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="VaultKey — Your passwords. Your privacy. Your control.">
<meta name="twitter:card" content="summary_large_image">
${preloads.map((p) => `<link rel="preload" href="${p}" as="font" type="font/woff" crossorigin>`).join('\n')}
${styles.map((s) => `<link rel="stylesheet" href="${s}">`).join('\n')}
${scripts.map((s) => `<script type="module" src="${s}"></script>`).join('\n')}
${jsonLd}
</head>
<body>
<div id="splash" class="splash" role="status" aria-live="polite" aria-label="Loading VaultKey">
  <div class="splash-inner">
    <div class="splash-mark" aria-hidden="true">
      <span class="splash-ring r1"></span><span class="splash-ring r2"></span><span class="splash-ring r3"></span>
      <svg viewBox="0 0 64 64" width="72" height="72" focusable="false">
        <defs><linearGradient id="splash-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00E59B"/><stop offset="1" stop-color="#00B879"/></linearGradient></defs>
        <rect x="2" y="2" width="60" height="60" rx="16" fill="#0D1210"/>
        <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="15.25" fill="none" stroke="url(#splash-g)" stroke-opacity=".55" stroke-width="1.5"/>
        <circle class="splash-dial" cx="32" cy="32" r="17" fill="none" stroke="url(#splash-g)" stroke-width="4" stroke-dasharray="80 27" stroke-linecap="round"/>
        <circle cx="32" cy="28.5" r="5" fill="url(#splash-g)"/>
        <path d="M29.6 31h4.8l1.6 9.5h-8z" fill="url(#splash-g)"/>
      </svg>
    </div>
    <p class="splash-name">VaultKey</p>
    <div class="splash-bar" aria-hidden="true"><span></span></div>
    <p class="splash-text">Preparing your secure generator…</p>
  </div>
</div>
<div id="root"></div>
<noscript><div class="noscript">VaultKey generates passwords locally with JavaScript and the Web Crypto API. Please enable JavaScript to use the generator.</div></noscript>
</body>
</html>
`;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

/**
 * Build everything into `outDir`.
 * @param {{ outDir?: string, dev?: boolean, siteUrl?: string, quiet?: boolean }} opts
 */
export async function buildAll(opts = {}) {
  const dev = !!opts.dev;
  const outDir = opts.outDir ?? path.join(ROOT, dev ? '.dev' : 'dist');
  const siteUrl = (opts.siteUrl ?? process.env.SITE_URL ?? '').replace(/\/+$/, '');
  if (siteUrl && !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(siteUrl)) throw new Error(`SITE_URL must be an https origin, got "${siteUrl}"`);
  const log = opts.quiet ? () => {} : console.log;
  const t0 = Date.now();

  fs.rmSync(outDir, { recursive: true, force: true });
  copyDir(PUBLIC, outDir);

  // JavaScript
  const result = await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: [path.join(SRC, 'main.tsx')],
    bundle: true,
    splitting: true,
    format: 'esm',
    outdir: path.join(outDir, 'assets'),
    entryNames: dev ? '[name]' : '[name]-[hash]',
    chunkNames: 'chunks/[name]-[hash]',
    minify: !dev,
    sourcemap: dev ? 'inline' : false,
    target: ['chrome111', 'safari16.4', 'firefox128', 'edge111'],
    jsx: 'automatic',
    legalComments: 'none',
    metafile: true,
    define: { 'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production') },
    drop: dev ? [] : ['debugger'],
    pure: dev ? [] : ['console.log', 'console.debug', 'console.info'],
    logLevel: 'warning',
  });
  const entryOut = Object.entries(result.metafile.outputs).find(([, o]) => o.entryPoint?.endsWith('main.tsx'))?.[0];
  if (!entryOut) throw new Error('Could not locate entry bundle');
  const mainJs = '/' + path.relative(outDir, path.join(ROOT, entryOut)).split(path.sep).join('/');

  // CSS
  const css = await buildCss({ minify: !dev });
  const cssName = dev ? 'app.css' : `app-${hash(css)}.css`;
  fs.writeFileSync(path.join(outDir, 'assets', cssName), css);

  // HTML per route
  const preloads = ['/fonts/Inter-Regular.woff', '/fonts/InterDisplay-SemiBold.woff'];
  const scripts = [mainJs, ...(dev ? ['/dev-reload.js'] : [])];
  for (const [route, meta] of Object.entries(ROUTES)) {
    const html = htmlShell({ route, meta, scripts, styles: [`/assets/${cssName}`], preloads, siteUrl, dev });
    const file = route === '/' ? 'index.html' : route === '/404' ? '404.html' : `${route.slice(1)}/index.html`;
    fs.mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
    fs.writeFileSync(path.join(outDir, file), html);
  }

  // SEO + hosting files
  const indexable = Object.keys(ROUTES).filter((r) => r !== '/404');
  let robots = 'User-agent: *\nAllow: /\n';
  if (siteUrl) {
    const today = new Date().toISOString().slice(0, 10);
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
      .map((r) => `  <url><loc>${siteUrl}${r}</loc><lastmod>${today}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`;
    fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);
    robots += `\nSitemap: ${siteUrl}/sitemap.xml\n`;
  } else {
    log('  ! SITE_URL not set: skipping sitemap.xml, canonical and og:url (see .env.example).');
  }
  fs.writeFileSync(path.join(outDir, 'robots.txt'), robots);
  fs.writeFileSync(path.join(outDir, '_headers'), cloudflareHeadersFile());
  if (dev) fs.writeFileSync(path.join(outDir, 'dev-reload.js'), "new EventSource('/esbuild').addEventListener('change', () => location.reload());\n");

  if (!opts.quiet) {
    const size = (f) => fs.statSync(path.join(ROOT, f)).size;
    const js = Object.keys(result.metafile.outputs).filter((f) => f.endsWith('.js'));
    log(`Built ${dev ? 'dev' : 'production'} bundle in ${Date.now() - t0} ms → ${path.relative(ROOT, outDir)}/`);
    for (const f of js) log(`  ${path.relative(outDir, path.join(ROOT, f)).padEnd(48)} ${(size(f) / 1024).toFixed(1).padStart(7)} kB`);
    log(`  ${('assets/' + cssName).padEnd(48)} ${(Buffer.byteLength(css) / 1024).toFixed(1).padStart(7)} kB`);
  }
  return { outDir, mainJs, cssName, metafile: result.metafile };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildAll().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
