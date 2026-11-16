export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const str = (v, max = 500) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e || '');

export function randomPassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (const n of buf) s += chars[n % chars.length];
  return s;
}

export const money = (n) => (n === null || n === undefined ? '' : `$${Number(n).toFixed(2)}`);
