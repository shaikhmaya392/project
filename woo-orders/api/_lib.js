import crypto from 'node:crypto';

const COOKIE = 'wo_session';
const MAX_AGE = 60 * 60 * 12; // 12 ghante

// SESSION_SECRET na ho to password + WooCommerce secret se ek pakka secret bana lo,
// taa ke login kabhi is wajah se na ruke.
function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  const base = `${process.env.ADMIN_PASS || ''}|${process.env.WC_SECRET || ''}`;
  if (base === '|') throw new Error('ADMIN_PASS set nahi hai.');
  return crypto.createHash('sha256').update('wo-session|' + base).digest('hex');
}

function sign(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('hex');
}

export function makeSessionCookie(user) {
  const payload = Buffer.from(JSON.stringify({ u: user, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isLoggedIn(req) {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) return false;
  const raw = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return false;
  const good = sign(payload);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}

export function safeEqual(a = '', b = '') {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function sendJson(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel already parsed
  let data = '';
  for await (const chunk of req) data += chunk;
  try { return JSON.parse(data || '{}'); } catch { return {}; }
}

/** Env se saare stores: WC_URL, WC_URL_2 ... WC_URL_5 */
export function getStores() {
  const stores = [];
  for (const suffix of ['', '_2', '_3', '_4', '_5']) {
    const url = process.env['WC_URL' + suffix];
    const key = process.env['WC_KEY' + suffix];
    const sec = process.env['WC_SECRET' + suffix];
    if (url && key && sec) {
      const clean = url.replace(/\/+$/, '');
      stores.push({ url: clean, key, secret: sec, name: new URL(clean).hostname.replace(/^www\./, '') });
    }
  }
  return stores;
}
