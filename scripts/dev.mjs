#!/usr/bin/env node
/** Development server: rebuilds on change and live-reloads the browser. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll } from './build.mjs';
import { startServer } from './preview.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(ROOT, '.dev');
const port = Number(process.env.PORT ?? 5173);

await buildAll({ dev: true, outDir });
const { url, notify } = await startServer({ dir: outDir, port, dev: true });
console.log(`VaultKey dev server → ${url}  (Ctrl+C to stop)`);

let timer = null;
let building = false;
const rebuild = () => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (building) return rebuild();
    building = true;
    try {
      await buildAll({ dev: true, outDir, quiet: true });
      console.log(`  rebuilt ${new Date().toLocaleTimeString()}`);
      notify();
    } catch (e) {
      console.error(e.message ?? e);
    } finally {
      building = false;
    }
  }, 80);
};
for (const d of ['src', 'public']) fs.watch(path.join(ROOT, d), { recursive: true }, rebuild);
