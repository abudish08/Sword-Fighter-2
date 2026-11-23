#!/usr/bin/env node
/**
 * Stage the playable static site into desktop-dist/ for Tauri packaging.
 * Browser / GitHub Pages keep using the repo root — this folder is desktop-only.
 */
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'desktop-dist');

const entries = ['index.html', 'css', 'js', 'public'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const name of entries) {
  const src = join(root, name);
  if (!existsSync(src)) {
    console.error(`Missing required path for desktop stage: ${name}`);
    process.exit(1);
  }
  cpSync(src, join(out, name), { recursive: true });
}

writeFileSync(
  join(out, '.desktop-stage.json'),
  JSON.stringify({ stagedAt: new Date().toISOString(), entries }, null, 2) + '\n'
);

console.log(`Staged desktop frontend → ${out}`);
