/**
 * Downloads every image, PDF order form and video used by the store from
 * certifiedortho.com into server/media/ so the store keeps working when the old
 * WordPress site is switched off. Afterwards set MEDIA_MODE=local in .env.
 *
 *   npm run mirror-media
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seed = (f) => fs.readFileSync(path.join(__dirname, '../seed', f), 'utf8');
const BASE = 'https://certifiedortho.com/wp-content/';
const OUT = path.join(__dirname, '../media');

const text = seed('pages.json') + seed('catalog.json') + seed('nav.json');
const urls = [...new Set(text.match(/https:\/\/certifiedortho\.com\/wp-content\/[^"'\s)<>\\]+/g) || [])];
console.log(`${urls.length} files to mirror…`);

let ok = 0; let skipped = 0; const failed = [];
for (const url of urls) {
  const rel = decodeURI(url.slice(BASE.length));
  const dest = path.join(OUT, rel);
  if (fs.existsSync(dest)) { skipped++; continue; }
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
    if (ok % 50 === 0) console.log(`  ${ok} downloaded`);
  } catch (e) {
    failed.push(`${url} (${e.message})`);
  }
}
console.log(`Done: ${ok} downloaded, ${skipped} already there, ${failed.length} failed.`);
if (failed.length) console.log(failed.join('\n'));
console.log('Now set MEDIA_MODE=local in server/.env and restart the store.');
