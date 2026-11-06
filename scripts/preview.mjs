#!/usr/bin/env node
/**
 * Minimal static server for the production build (and the dev server).
 * Mirrors the hosting setup: security headers from scripts/security.mjs,
 * /route → /route/index.html, unknown paths → 404.html with HTTP 404.
 *
 * Usage: node scripts/preview.mjs [--port 4173] [--dir dist]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SECURITY_HEADERS, IMMUTABLE_CACHE } from './security.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

/**
 * @param {{ dir?: string, port?: number, host?: string, dev?: boolean }} opts
 * @returns {Promise<{ server: http.Server, url: string, notify: () => void }>}
 */
export function startServer(opts = {}) {
  const dir = path.resolve(opts.dir ?? path.join(ROOT, 'dist'));
  const clients = new Set();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (opts.dev && url.pathname === '/esbuild') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }
    let file = path.join(dir, path.normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(dir)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    let status = 200;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && fs.existsSync(file.replace(/\/$/, '') + '/index.html')) file = file.replace(/\/$/, '') + '/index.html';
    if (!fs.existsSync(file)) {
      file = path.join(dir, '404.html');
      status = 404;
    }
    const headers = { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' };
    if (!opts.dev) Object.assign(headers, SECURITY_HEADERS);
    headers['Cache-Control'] = !opts.dev && /\/(assets|fonts)\//.test(pathname) ? IMMUTABLE_CACHE : 'no-cache';
    res.writeHead(status, headers);
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(file).pipe(res);
  });
  const port = opts.port ?? 4173;
  const host = opts.host ?? '127.0.0.1';
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const addr = server.address();
      const url = `http://${host}:${typeof addr === 'object' && addr ? addr.port : port}`;
      resolve({
        server,
        url,
        notify: () => {
          for (const c of clients) c.write('event: change\ndata: reload\n\n');
        },
      });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name, def) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : def;
  };
  const { url } = await startServer({ port: Number(arg('port', 4173)), dir: arg('dir', undefined), host: arg('host', '127.0.0.1') });
  console.log(`VaultKey preview (production build) → ${url}`);
}
