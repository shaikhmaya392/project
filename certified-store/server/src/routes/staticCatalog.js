/**
 * Read-only storefront used while MONGODB_URI is not configured yet:
 * catalog, product pages and search are served straight from seed/*.json,
 * everything that needs the database (login, orders, account requests) answers 503.
 * Same responses as routes/catalog.js.
 */
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeed } from '../lib/seedData.js';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NAV = JSON.parse(fs.readFileSync(path.join(__dirname, '../../seed/nav.json'), 'utf8'));

const r = Router();
let data = null;
const load = () => {
  if (!data) {
    const { rows, pages } = buildSeed();
    data = { rows: rows.filter((x) => x.active !== false), pages, bySlug: new Map(pages.map((p) => [p.slug, p])) };
  }
  return data;
};

const FIELDS = ['seq', 'kind', 'type', 'text', 'section', 'major', 'sub', 'partNumber', 'name', 'price', 'priceLabel', 'unit', 'lines', 'page', 'pages', 'image', 'siteCaption'];
const pick = (row) => Object.fromEntries(FIELDS.filter((f) => row[f] !== undefined).map((f) => [f, row[f]]));
const PAGE_LIST = (p) => ({ slug: p.slug, title: p.title, image: p.image, parent: p.parent });

r.get('/site', (_req, res) => res.json({ ...NAV, mediaMode: config.mediaMode }));
r.get('/home', (_req, res) => res.json({ blocks: load().bySlug.get('home')?.blocks || [] }));

r.get('/pages/:slug', (req, res) => {
  const { rows, pages, bySlug } = load();
  const page = bySlug.get(req.params.slug);
  if (!page) return res.status(404).json({ message: 'Page not found' });
  const products = rows.filter((x) => x.kind === 'product' && (x.pages || []).includes(page.slug)).map(pick);
  const subs = new Set(products.map((p) => `${p.type}|${p.major}|${p.sub}`));
  const notes = subs.size ? rows.filter((n) => n.kind === 'note' && subs.has(`${n.type}|${n.major}|${n.sub}`)).map(pick) : [];
  const breadcrumbs = [];
  const guard = new Set();
  let p = page;
  while (p?.parent && !guard.has(p.parent)) {
    guard.add(p.parent);
    p = bySlug.get(p.parent);
    if (!p) break;
    breadcrumbs.unshift({ slug: p.slug, title: p.title });
  }
  res.json({
    slug: page.slug, title: page.title, parent: page.parent, image: page.image, blocks: page.blocks || [], sourceUrl: page.sourceUrl,
    breadcrumbs, children: pages.filter((c) => c.parent === page.slug).map(({ slug, title, image }) => ({ slug, title, image })), products, notes,
  });
});

r.get('/catalog', (req, res) => {
  const type = String(req.query.type || '').slice(0, 20);
  const ok = ['general', 'custom', 'thirdparty'].includes(type);
  res.json(load().rows.filter((x) => !ok || x.type === type).map(pick));
});

r.get('/products/:partNumber', (req, res) => {
  const row = load().rows.find((x) => x.kind === 'product' && x.partNumber === req.params.partNumber);
  if (!row) return res.status(404).json({ message: 'Product not found' });
  res.json(pick(row));
});

const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
r.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) return res.json({ pages: [], products: [] });
  const all = q.split(/\s+/).filter(Boolean).map((w) => new RegExp(escRx(w), 'i'));
  const { rows, pages } = load();
  const products = rows.filter((x) => x.kind === 'product'
    && all.every((rx) => [x.partNumber, x.name, x.sub, x.major].some((v) => v && rx.test(v)))).slice(0, 60).map(pick);
  const found = pages.filter((p) => p.slug !== 'home' && all.every((rx) => rx.test(p.title || '') || rx.test(p.searchText || ''))).slice(0, 24).map(PAGE_LIST);
  found.sort((a, b) => Number(all.every((x) => x.test(b.title))) - Number(all.every((x) => x.test(a.title))));
  res.json({ pages: found, products });
});

r.get('/auth/me', (_req, res) => res.json({ user: null }));
r.get('/admin/me', (_req, res) => res.status(401).json({ message: 'Store admin is not set up yet (database not configured).' }));

r.use((_req, res) => res.status(503).json({
  message: 'Online ordering is being set up. Please call 970-482-7116 or email info@certifiedortho.com to order.',
}));

export default r;
