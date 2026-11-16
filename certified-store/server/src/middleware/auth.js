import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { Customer, Admin } from '../models/index.js';

const COOKIE = { customer: 'co_session', admin: 'co_admin' };

export function setSession(res, kind, id) {
  const token = jwt.sign({ id: String(id), kind }, config.jwtSecret, { expiresIn: '14d' });
  res.cookie(COOKIE[kind], token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.env === 'production',
    maxAge: 14 * 24 * 3600 * 1000,
  });
}

export function clearSession(res, kind) {
  res.clearCookie(COOKIE[kind]);
}

function read(req, kind) {
  const t = req.cookies?.[COOKIE[kind]];
  if (!t) return null;
  try {
    const p = jwt.verify(t, config.jwtSecret);
    return p.kind === kind ? p.id : null;
  } catch {
    return null;
  }
}

export async function loadCustomer(req, _res, next) {
  const id = read(req, 'customer');
  if (id) {
    const c = await Customer.findById(id);
    if (c && c.active) req.customer = c;
  }
  next();
}

export function requireCustomer(req, res, next) {
  if (!req.customer) return res.status(401).json({ message: 'Please log in to continue.' });
  next();
}

export async function requireAdmin(req, res, next) {
  const id = read(req, 'admin');
  if (!id) return res.status(401).json({ message: 'Admin login required.' });
  const a = await Admin.findById(id);
  if (!a || !a.active) return res.status(401).json({ message: 'Admin login required.' });
  req.admin = a;
  next();
}

export const publicCustomer = (c) => c && ({
  id: c._id,
  email: c.email,
  name: c.name,
  businessName: c.businessName,
  phone: c.phone,
  mustChangePassword: c.mustChangePassword,
  crmLinked: !!c.crmAccountId,
  crmCustomerId: c.crmCustomerId,
});
