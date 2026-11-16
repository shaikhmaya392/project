/**
 * Store admin – used by the Certified Ortho team (CRM owner) to turn an approved
 * account request into a store login linked to a CRM customer, and to watch
 * store orders reaching the CRM. Orders themselves are processed in the CRM.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { Admin, Customer, AccountRequest, Order, Outbox, CatalogRow, Page } from '../models/index.js';
import { wrap, str, isEmail, randomPassword } from '../utils/http.js';
import { setSession, clearSession, requireAdmin } from '../middleware/auth.js';
import { crm, crmConfigured } from '../services/crm.js';
import { syncOrderToCrm } from '../services/orders.js';
import { sendMail, layout, esc } from '../services/mailer.js';
import { config } from '../config.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });

r.post('/login', limiter, wrap(async (req, res) => {
  const a = await Admin.findOne({ email: str(req.body.email, 200).toLowerCase(), active: true });
  if (!a || !(await bcrypt.compare(String(req.body.password || ''), a.passwordHash))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  setSession(res, 'admin', a._id);
  res.json({ admin: { email: a.email, name: a.name } });
}));
r.post('/logout', (req, res) => { clearSession(res, 'admin'); res.json({ ok: true }); });

r.use(requireAdmin);
r.get('/me', (req, res) => res.json({ admin: { email: req.admin.email, name: req.admin.name } }));

r.get('/stats', wrap(async (_req, res) => {
  const [requests, customers, orders, unsynced, products, pages] = await Promise.all([
    AccountRequest.countDocuments({ status: 'new' }), Customer.countDocuments(), Order.countDocuments(),
    Order.countDocuments({ 'crm.synced': { $ne: true } }), CatalogRow.countDocuments({ kind: 'product' }), Page.countDocuments(),
  ]);
  let crmStatus = { configured: crmConfigured(), ok: false };
  if (crmConfigured()) {
    try { await crm.ping(); crmStatus.ok = true; } catch (e) { crmStatus.error = e.message; }
  }
  res.json({ requests, customers, orders, unsynced, products, pages, crm: crmStatus, smtp: !!config.mail.host });
}));

/* ------------------------------------------------------------ account requests */
r.get('/requests', wrap(async (req, res) => {
  const q = req.query.status ? { status: str(req.query.status, 20) } : {};
  res.json(await AccountRequest.find(q).sort({ createdAt: -1 }).limit(500).populate('customer', 'email').lean());
}));
r.patch('/requests/:id', wrap(async (req, res) => {
  const status = str(req.body.status, 20);
  if (!['new', 'approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Bad status' });
  res.json(await AccountRequest.findByIdAndUpdate(req.params.id, { status }, { new: true }));
}));

/* ------------------------------------------------------------ CRM customers */
r.get('/crm/accounts', wrap(async (req, res) => {
  const q = str(req.query.q, 100).toLowerCase();
  const list = await crm.listAccounts();
  const hit = (a) => !q || [a.name, a.customerId, a.email, a.billTo?.email, a.billTo?.company, ...(a.buyers || []).map((b) => b.email)]
    .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  res.json((list || []).filter(hit).slice(0, 50).map((a) => ({
    id: a._id, name: a.name, customerId: a.customerId, email: a.email || a.billTo?.email || '', phone: a.phone || a.billTo?.phone || '',
    city: a.billTo?.city || '', state: a.billTo?.state || '', category: a.category,
  })));
}));

/* ------------------------------------------------------------ store logins */
r.get('/customers', wrap(async (_req, res) => {
  res.json(await Customer.find({}, '-passwordHash -resetToken').sort({ createdAt: -1 }).lean());
}));

async function emailCredentials(c, password, isReset) {
  return sendMail({
    to: c.email,
    kind: isReset ? 'credentials-reset' : 'credentials',
    subject: isReset ? 'Your new Certified Ortho store password' : 'Your Certified Ortho online store account is ready',
    html: layout(isReset ? 'Your password was reset' : 'Your store account is ready', `<p>Hi ${esc(c.name || '')},</p>
      <p>${isReset ? 'Here is your new temporary password' : 'You can now order online from Certified Ortho. Here are your login details'}:</p>
      <table style="font-size:14px;background:#f6f8fb;border:1px solid #e3e8f0;border-radius:8px;padding:12px 16px">
        <tr><td style="color:#51617d;padding:3px 14px 3px 0">Store</td><td><a href="${config.storeUrl}">${config.storeUrl}</a></td></tr>
        <tr><td style="color:#51617d;padding:3px 14px 3px 0">Name</td><td>${esc(c.name || '')}</td></tr>
        <tr><td style="color:#51617d;padding:3px 14px 3px 0">Email (login)</td><td><b>${esc(c.email)}</b></td></tr>
        <tr><td style="color:#51617d;padding:3px 14px 3px 0">Password</td><td><b style="font-family:monospace;font-size:15px">${esc(password)}</b></td></tr>
      </table>
      <p>You will be asked to choose your own password after you log in.</p>
      <p><a href="${config.storeUrl}/?login=1" style="display:inline-block;background:#1d5bd6;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Log in to the store</a></p>`),
  });
}

r.post('/customers', wrap(async (req, res) => {
  const b = req.body || {};
  const email = str(b.email, 200).toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ message: 'Valid email is required.' });
  if (await Customer.findOne({ email })) return res.status(409).json({ message: 'A store login with this email already exists.' });
  const password = str(b.password, 100) || randomPassword();
  let crmCustomerId = '';
  let crmName = '';
  if (b.crmAccountId) {
    try {
      const a = await crm.getAccount(str(b.crmAccountId, 40));
      crmCustomerId = a.customerId || '';
      crmName = a.name || '';
    } catch (e) {
      return res.status(400).json({ message: `CRM customer not found: ${e.message}` });
    }
  }
  const c = await Customer.create({
    email,
    name: str(b.name, 200),
    businessName: str(b.businessName, 200) || crmName,
    phone: str(b.phone, 60),
    passwordHash: await bcrypt.hash(password, 10),
    mustChangePassword: true,
    crmAccountId: str(b.crmAccountId, 40) || undefined,
    crmCustomerId,
    accountRequest: b.requestId || undefined,
    createdBy: req.admin.email,
  });
  if (b.requestId) await AccountRequest.findByIdAndUpdate(b.requestId, { status: 'approved', customer: c._id });
  const mail = b.sendEmail === false ? null : await emailCredentials(c, password, false);
  res.status(201).json({ customer: { id: c._id, email: c.email }, password: b.sendEmail === false ? password : undefined, mail });
}));

r.patch('/customers/:id', wrap(async (req, res) => {
  const c = await Customer.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Not found' });
  const b = req.body || {};
  for (const k of ['name', 'businessName', 'phone']) if (k in b) c[k] = str(b[k], 200);
  if ('active' in b) c.active = !!b.active;
  if ('crmAccountId' in b) {
    c.crmAccountId = str(b.crmAccountId, 40) || undefined;
    c.crmCustomerId = '';
    if (c.crmAccountId) {
      const a = await crm.getAccount(c.crmAccountId);
      c.crmCustomerId = a.customerId || '';
      if (!c.businessName) c.businessName = a.name;
    }
  }
  await c.save();
  res.json({ ok: true });
}));

r.post('/customers/:id/reset-password', wrap(async (req, res) => {
  const c = await Customer.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Not found' });
  const password = randomPassword();
  c.passwordHash = await bcrypt.hash(password, 10);
  c.mustChangePassword = true;
  await c.save();
  const mail = await emailCredentials(c, password, true);
  res.json({ ok: true, mail });
}));

/* ------------------------------------------------------------ orders */
r.get('/orders', wrap(async (_req, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }).limit(500).populate('customer', 'email name businessName').lean());
}));
r.post('/orders/:id/sync', wrap(async (req, res) => {
  const o = await syncOrderToCrm(req.params.id);
  if (!o) return res.status(404).json({ message: 'Not found' });
  res.json({ synced: o.crm.synced, quoteNumber: o.crm.quoteNumber, error: o.crm.error });
}));

r.get('/outbox', wrap(async (_req, res) => {
  res.json(await Outbox.find().sort({ createdAt: -1 }).limit(100).lean());
}));

export default r;
