/**
 * WooCommerce-style shop API (products with variations, categories, filters).
 * Served from seed/products.json + seed/categories.json in memory (fast, and it
 * works on Vercel even before MongoDB is configured). Orders still use the SKU
 * (partNumber) of the chosen variation, so checkout / CRM quotes are unchanged.
 */
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '../../seed', f), 'utf8'));

let DATA = null;
function load() {
  if (DATA) return DATA;
  const products = read('products.json');
  const categories = read('categories.json');
  const pages = read('pages.json');
  const pageBySlug = new Map(pages.map((p) => [p.slug, p]));
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  products.forEach((p, i) => {
    p.order = i; // price-list order
    p.search = [p.name, p.group, ...p.variations.map((v) => `${v.sku} ${v.name}`), ...p.categories.map((c) => catBySlug.get(c)?.name || '')]
      .join(' ').toLowerCase();
  });
  DATA = { products, categories, pageBySlug, catBySlug, bySlug: new Map(products.map((p) => [p.slug, p])) };
  return DATA;
}

const card = (p) => ({
  slug: p.slug,
  name: p.name,
  kind: p.kind,
  image: p.images[0] || null,
  imageIsCategory: !!p.imageIsCategory,
  category: p.categories[p.categories.length - 1],
  priceMin: p.priceMin,
  priceMax: p.priceMax,
  count: p.variations.length,
  // simple products can be added straight from the card
  sku: p.kind === 'simple' ? p.variations[0] : undefined,
});

const r = Router();

r.get('/shop/categories', (_req, res) => res.json(load().categories));

/** Product ID → product page + picture (used by the full price list) */
r.get('/shop/skus', (_req, res) => {
  const out = {};
  for (const p of load().products) for (const v of p.variations) out[v.sku] = { slug: p.slug, image: v.image || p.images[0] || null };
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(out);
});

r.get('/shop/products', (req, res) => {
  const { products, catBySlug } = load();
  const q = String(req.query.q || '').toLowerCase().trim().slice(0, 80);
  const cat = String(req.query.category || '');
  const min = req.query.min !== undefined && req.query.min !== '' ? Number(req.query.min) : null;
  const max = req.query.max !== undefined && req.query.max !== '' ? Number(req.query.max) : null;
  const sort = String(req.query.sort || 'default');
  const perPage = Math.min(96, Math.max(6, parseInt(req.query.perPage, 10) || 24));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  let list = products;
  if (cat) list = list.filter((p) => p.categories.includes(cat));
  const line = String(req.query.line || '');
  if (line) list = list.filter((p) => p.page === line);
  if (req.query.withImage) list = list.filter((p) => p.images.length > 0);
  const exclude = String(req.query.exclude || '').split(',').filter(Boolean);
  if (exclude.length) list = list.filter((p) => !p.categories.some((c) => exclude.includes(c)));
  if (q) {
    const words = q.split(/\s+/);
    list = list.filter((p) => words.every((w) => p.search.includes(w)));
  }
  const priceRange = { min: Infinity, max: 0 };
  for (const p of list) {
    if (p.priceMin != null && p.priceMin > 0) priceRange.min = Math.min(priceRange.min, p.priceMin);
    if (p.priceMax != null) priceRange.max = Math.max(priceRange.max, p.priceMax);
  }
  if (min !== null) list = list.filter((p) => p.priceMax != null && p.priceMax >= min);
  if (max !== null) list = list.filter((p) => p.priceMin != null && p.priceMin <= max);
  const byPrice = (a, b) => (a.priceMin ?? 1e9) - (b.priceMin ?? 1e9);
  if (sort === 'price-asc') list = [...list].sort(byPrice);
  else if (sort === 'price-desc') list = [...list].sort((a, b) => (b.priceMax ?? -1) - (a.priceMax ?? -1));
  else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  else if (q) {
    // name matches first
    list = [...list].sort((a, b) => Number(b.name.toLowerCase().includes(q)) - Number(a.name.toLowerCase().includes(q)) || a.order - b.order);
  }
  const total = list.length;
  res.json({
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
    priceRange: priceRange.min === Infinity ? null : { min: Math.floor(priceRange.min), max: Math.ceil(priceRange.max) },
    category: cat ? catBySlug.get(cat) || null : null,
    products: list.slice((page - 1) * perPage, page * perPage).map(card),
  });
});

r.get('/shop/product/:slug', (req, res) => {
  const { bySlug, pageBySlug, catBySlug, products } = load();
  const p = bySlug.get(req.params.slug);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  const page = p.page ? pageBySlug.get(p.page) : null; // only its title is sent – the product has its own details
  // other products from the same product line (add-ons, other models) – like WooCommerce "related"
  const sameLine = products.filter((x) => x !== p && p.page && x.page === p.page).slice(0, 12).map(card);
  const sameCat = sameLine.length < 4
    ? products.filter((x) => x !== p && x.categories.at(-1) === p.categories.at(-1) && x.page !== p.page).slice(0, 8 - sameLine.length).map(card)
    : [];
  res.json({
    ...p,
    search: undefined,
    breadcrumbs: p.categories.map((c) => ({ slug: c, name: catBySlug.get(c)?.name || c })),
    lineTitle: page?.title || null,
    related: [...sameLine, ...sameCat].slice(0, 8),
  });
});

export default r;
export { load as loadShop };
