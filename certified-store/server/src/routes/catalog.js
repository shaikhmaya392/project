import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogRow, Page } from '../models/index.js';
import { wrap, str } from '../utils/http.js';
import { config } from '../config.js';

const r = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NAV = JSON.parse(fs.readFileSync(path.join(__dirname, '../../seed/nav.json'), 'utf8'));

const ROW_FIELDS = 'seq kind type text section major sub partNumber name price priceLabel unit lines page pages image siteCaption -_id';

r.get('/site', (_req, res) => {
  res.json({ ...NAV, mediaMode: config.mediaMode });
});

r.get('/home', wrap(async (_req, res) => {
  const home = await Page.findOne({ slug: 'home' }).lean();
  res.json({ blocks: home?.blocks || [] });
}));

async function breadcrumbs(page) {
  const out = [];
  let p = page;
  const guard = new Set();
  while (p?.parent && !guard.has(p.parent)) {
    guard.add(p.parent);
    p = await Page.findOne({ slug: p.parent }, 'slug title parent').lean();
    if (!p) break;
    out.unshift({ slug: p.slug, title: p.title });
  }
  return out;
}

r.get('/pages/:slug', wrap(async (req, res) => {
  const page = await Page.findOne({ slug: req.params.slug }).lean();
  if (!page) return res.status(404).json({ message: 'Page not found' });
  // SKUs that belong to this product page (CRM price list rows), in price-list order
  const products = await CatalogRow.find({ kind: 'product', pages: page.slug, active: true }, ROW_FIELDS).sort({ seq: 1 }).lean();
  const children = await Page.find({ parent: page.slug }, 'slug title image').lean();
  const subs = [...new Set(products.map((p) => `${p.type}|${p.major}|${p.sub}`))];
  const notes = subs.length
    ? (await CatalogRow.find({ kind: 'note' }, ROW_FIELDS).sort({ seq: 1 }).lean()).filter((n) => subs.includes(`${n.type}|${n.major}|${n.sub}`))
    : [];
  const order = (page.blocks || []);
  res.json({
    slug: page.slug,
    title: page.title,
    parent: page.parent,
    image: page.image,
    blocks: order,
    sourceUrl: page.sourceUrl,
    breadcrumbs: await breadcrumbs(page),
    children,
    products,
    notes,
  });
}));

/** Full CRM price list (headings, notes, kit lines, products) – optionally one type */
r.get('/catalog', wrap(async (req, res) => {
  const q = {};
  const type = str(req.query.type, 20);
  if (['general', 'custom', 'thirdparty'].includes(type)) q.type = type;
  const rows = await CatalogRow.find({ ...q, active: true }, ROW_FIELDS).sort({ seq: 1 }).lean();
  res.json(rows);
}));

r.get('/products/:partNumber', wrap(async (req, res) => {
  const row = await CatalogRow.findOne({ kind: 'product', partNumber: req.params.partNumber }, ROW_FIELDS).lean();
  if (!row) return res.status(404).json({ message: 'Product not found' });
  res.json(row);
}));

const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

r.get('/search', wrap(async (req, res) => {
  const q = str(req.query.q, 80);
  if (q.length < 2) return res.json({ pages: [], products: [] });
  const words = q.split(/\s+/).filter(Boolean).map(escRx);
  const all = words.map((w) => new RegExp(w, 'i'));
  const products = await CatalogRow.find({
    kind: 'product',
    active: true,
    $and: all.map((rx) => ({ $or: [{ partNumber: rx }, { name: rx }, { sub: rx }, { major: rx }] })),
  }, ROW_FIELDS).sort({ seq: 1 }).limit(60).lean();
  const pages = await Page.find({
    slug: { $ne: 'home' },
    $and: all.map((rx) => ({ $or: [{ title: rx }, { searchText: rx }] })),
  }, 'slug title image parent').limit(24).lean();
  // title matches first
  pages.sort((a, b) => Number(all.every((x) => x.test(b.title))) - Number(all.every((x) => x.test(a.title))));
  res.json({ pages, products });
}));

export default r;
