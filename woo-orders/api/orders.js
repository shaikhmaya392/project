import { getStores, isLoggedIn, sendJson } from './_lib.js';

const PER_PAGE = 100;
const MAX_PAGES = 20; // ek store se zyada se zyada 2000 orders

async function fetchStoreOrders(store, from, to) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const q = new URLSearchParams({
      per_page: String(PER_PAGE),
      page: String(page),
      orderby: 'date',
      order: 'desc',
      consumer_key: store.key,
      consumer_secret: store.secret,
    });
    if (from) q.set('after', `${from}T00:00:00`);
    if (to) q.set('before', `${to}T23:59:59`);

    const r = await fetch(`${store.url}/wp-json/wc/v3/orders?${q}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try { msg = (await r.json()).message || msg; } catch {}
      throw new Error(`${store.name}: ${msg}`);
    }
    const orders = await r.json();
    for (const o of orders) {
      const b = o.billing || {};
      const name = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.email || 'Guest';
      for (const item of o.line_items || []) {
        rows.push({
          store: store.name,
          order_id: o.number || o.id,
          edit_url: `${store.url}/wp-admin/post.php?post=${o.id}&action=edit`,
          image: item.image?.src || '',
          customer: name,
          email: b.email || '',
          phone: b.phone || '',
          product: item.name,
          qty: item.quantity,
          price: Number(item.total || 0),
          currency: o.currency,
          status: o.status,
          date: o.date_created, // store ke timezone mein
        });
      }
    }
    const totalPages = Number(r.headers.get('x-wp-totalpages') || 1);
    if (page >= totalPages || orders.length < PER_PAGE) break;
  }
  return rows;
}

const isDate = d => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : '');

export default async function handler(req, res) {
  try {
    if (!isLoggedIn(req)) return sendJson(res, 401, { error: 'Login required' });

    const url = new URL(req.url, 'http://x');
    if (url.searchParams.get('check')) return sendJson(res, 200, { ok: true });
    const from = isDate(url.searchParams.get('from'));
    const to = isDate(url.searchParams.get('to'));

    const stores = getStores();
    if (!stores.length) return sendJson(res, 500, { error: 'Koi store set nahi hai. Vercel mein WC_URL, WC_KEY, WC_SECRET daalein.' });

    const results = await Promise.allSettled(stores.map(s => fetchStoreOrders(s, from, to)));
    const rows = [];
    const errors = [];
    results.forEach(r => (r.status === 'fulfilled' ? rows.push(...r.value) : errors.push(r.reason.message)));
    rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    sendJson(res, 200, { rows, errors, stores: stores.map(s => s.name), updated: new Date().toISOString() });
  } catch (e) {
    sendJson(res, 500, { error: e.message });
  }
}
