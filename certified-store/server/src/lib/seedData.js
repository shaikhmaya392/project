/**
 * Loads seed/catalog.json + seed/pages.json into MongoDB.
 * Used by `npm run seed` and automatically on first start when the catalog is empty
 * (so a fresh Vercel deployment works with only MONGODB_URI set).
 * Replaces catalog + pages only – never touches customers/orders.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogRow, Page } from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '../../seed', f), 'utf8'));

function blockText(blocks, acc = []) {
  for (const b of blocks || []) {
    if (b.text) acc.push(b.text);
    if (b.html) acc.push(b.html.replace(/<[^>]+>/g, ' '));
    if (b.title) acc.push(b.title);
    if (b.rows) for (const r of b.rows) acc.push(r.cells.join(' '));
    if (b.items) for (const i of b.items) acc.push(i.text || i.title || '', (i.html || '').replace(/<[^>]+>/g, ' '));
    if (b.cols) for (const c of b.cols) blockText(c, acc);
    if (b.blocks) blockText(b.blocks, acc);
    if (b.tabs) for (const t of b.tabs) { acc.push(t.title); blockText(t.blocks, acc); }
    if (b.cards) for (const c of b.cards) acc.push(c.title);
    if (b.slides) for (const s of b.slides) acc.push(s.heading, s.text);
  }
  return acc;
}

export async function seedCatalog() {
  const catalog = read('catalog.json');
  const pages = read('pages.json');
  const rows = [];
  let seq = 0;
  for (const r of catalog) {
    if (r.kind === 'line') {
      // kit contents: printed under the product they belong to
      const last = rows[rows.length - 1];
      if (last && last.kind === 'product') last.lines.push(r.text);
      continue;
    }
    seq += 1;
    rows.push({ ...r, seq, lines: [] });
  }
  await CatalogRow.deleteMany({});
  await CatalogRow.insertMany(rows);
  await Page.deleteMany({});
  await Page.insertMany(pages.map((p) => ({ ...p, searchText: blockText(p.blocks).join(' ').replace(/\s+/g, ' ').slice(0, 20000) })));
  await CatalogRow.syncIndexes();
  await Page.syncIndexes();
  const products = rows.filter((r) => r.kind === 'product').length;
  return { products, other: rows.length - products, pages: pages.length };
}
