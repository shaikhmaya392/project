import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { Customer, AccountRequest } from '../models/index.js';
import { wrap, str, isEmail } from '../utils/http.js';
import { setSession, clearSession, requireCustomer, publicCustomer } from '../middleware/auth.js';
import { crm } from '../services/crm.js';
import { sendMail, layout, esc } from '../services/mailer.js';
import { config } from '../config.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const formLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

/* ----------------------------------------------------------- customer login */

r.post('/auth/login', limiter, wrap(async (req, res) => {
  const email = str(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || '');
  const c = await Customer.findOne({ email });
  if (!c || !c.passwordHash || !(await bcrypt.compare(password, c.passwordHash))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  if (!c.active) return res.status(403).json({ message: 'This account is disabled. Please call 970-482-7116.' });
  c.lastLoginAt = new Date();
  await c.save();
  setSession(res, 'customer', c._id);
  res.json({ user: publicCustomer(c) });
}));

r.post('/auth/logout', (req, res) => {
  clearSession(res, 'customer');
  res.json({ ok: true });
});

r.get('/auth/me', (req, res) => {
  res.json({ user: req.customer ? publicCustomer(req.customer) : null });
});

r.post('/auth/change-password', requireCustomer, wrap(async (req, res) => {
  const current = String(req.body.current || '');
  const next = String(req.body.password || '');
  if (next.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  if (!(await bcrypt.compare(current, req.customer.passwordHash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  req.customer.passwordHash = await bcrypt.hash(next, 10);
  req.customer.mustChangePassword = false;
  await req.customer.save();
  res.json({ ok: true, user: publicCustomer(req.customer) });
}));

r.post('/auth/forgot', limiter, wrap(async (req, res) => {
  const email = str(req.body.email, 200).toLowerCase();
  const c = await Customer.findOne({ email, active: true });
  if (c) {
    const token = crypto.randomBytes(24).toString('hex');
    c.resetToken = crypto.createHash('sha256').update(token).digest('hex');
    c.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await c.save();
    const link = `${config.storeUrl}/reset-password?token=${token}`;
    await sendMail({
      to: c.email,
      kind: 'reset',
      subject: 'Reset your Certified Ortho store password',
      html: layout('Reset your password', `<p>Hi ${esc(c.name || '')},</p>
        <p>Click the button below to choose a new password. The link is valid for 1 hour.</p>
        <p><a href="${link}" style="display:inline-block;background:#1d5bd6;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p>
        <p style="color:#51617d;font-size:13px">If you did not ask for this, you can ignore this email.</p>`),
    });
  }
  res.json({ ok: true, message: 'If an account exists for that email, a reset link has been sent.' });
}));

r.post('/auth/reset', limiter, wrap(async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const c = await Customer.findOne({ resetToken: hash, resetTokenExpires: { $gt: new Date() } });
  if (!c) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
  c.passwordHash = await bcrypt.hash(password, 10);
  c.mustChangePassword = false;
  c.resetToken = undefined;
  c.resetTokenExpires = undefined;
  await c.save();
  setSession(res, 'customer', c._id);
  res.json({ ok: true, user: publicCustomer(c) });
}));

/* ------------------------------------------------- request an account (popup) */
// Same fields as the certifiedortho.com "Become a Certified Ortho Customer" form,
// forwarded to the CRM public leads endpoint exactly like the live site does.

export const HEAR_ABOUT = ['Google / Web search', 'Referral from a colleague', 'Trade show / Conference', 'Sales representative', 'Social media', 'Other'];

r.post('/account-requests', formLimiter, wrap(async (req, res) => {
  const b = req.body || {};
  const data = {
    businessName: str(b.businessName, 200),
    personName: str(b.personName, 200),
    personTitle: str(b.personTitle, 200),
    email: str(b.email, 200).toLowerCase(),
    phone: str(b.phone, 60),
    fax: str(b.fax, 60),
    website: str(b.website, 300),
    hearAbout: str(b.hearAbout, 200),
    message: str(b.message, 4000),
  };
  const missing = ['businessName', 'personName', 'email', 'phone'].filter((k) => !data[k]);
  if (missing.length) return res.status(400).json({ message: 'Please fill in the required fields marked with *.', fields: missing });
  if (!isEmail(data.email)) return res.status(400).json({ message: 'Please enter a valid email address.', fields: ['email'] });
  if (data.hearAbout === 'Other') {
    const other = str(b.hearOther, 120);
    if (!other) return res.status(400).json({ message: 'Please tell us where you heard about us.', fields: ['hearOther'] });
    data.hearAbout = `Other: ${other}`;
  }
  // simple bot trap: forms submitted in under 2 seconds
  if (Number(b.elapsed) > 0 && Number(b.elapsed) < 2000) return res.json({ ok: true });

  const existing = await Customer.findOne({ email: data.email });
  const cart = Array.isArray(b.cart) ? b.cart.slice(0, 50).map((i) => ({ partNumber: str(i.partNumber, 60), name: str(i.name, 300), qty: Number(i.qty) || 1 })) : [];
  const reqDoc = await AccountRequest.create({ ...data, cartSnapshot: cart, ip: req.ip });

  // → CRM Leads (same endpoint the live website uses)
  try {
    const cartText = cart.length ? `\n\nItems in cart: ${cart.map((i) => `${i.qty} × ${i.partNumber}`).join(', ')}` : '';
    await crm.createPublicLead({
      ...data,
      message: `${data.message}${data.message ? '\n\n' : ''}[Online store – request for a store login]${cartText}`,
      elapsed: Number(b.elapsed) || 5000,
    });
    reqDoc.crmLead = { ok: true, at: new Date() };
  } catch (e) {
    reqDoc.crmLead = { ok: false, error: e.message, at: new Date() };
  }
  await reqDoc.save();

  const rows = Object.entries({
    'Business Name': data.businessName, 'Person Name': data.personName, 'Person Title': data.personTitle,
    Email: data.email, Phone: data.phone, Fax: data.fax, Website: data.website,
    'Where did you hear about us?': data.hearAbout, Message: data.message,
  }).filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:4px 10px 4px 0;color:#51617d">${esc(k)}</td><td style="padding:4px 0">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
  await sendMail({
    to: config.mail.ownerEmail,
    kind: 'account-request',
    subject: `New store account request – ${data.businessName}`,
    html: layout('New store account request', `<p>A customer asked for a login to the online store.${existing ? ' <b>Note: a store login already exists for this email.</b>' : ''}</p>
      <table style="font-size:14px">${rows}</table>
      <p>It was also sent to the CRM as a Lead${reqDoc.crmLead.ok ? '' : ' – <b style="color:#c22f3e">but the CRM did not accept it: ' + esc(reqDoc.crmLead.error) + '</b>'}.</p>
      <p><a href="${config.storeUrl}/admin/requests" style="display:inline-block;background:#1d5bd6;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Create the store login</a></p>`),
  });
  await sendMail({
    to: data.email,
    kind: 'account-request-received',
    subject: 'We received your Certified Ortho account request',
    html: layout('Thank you!', `<p>Hi ${esc(data.personName)},</p>
      <p>We received your request. A member of our team will contact you within one business day. Once your account is ready, we will email you your login details for the online store.</p>
      <p>Need us sooner? Call <a href="tel:9704827116">970-482-7116</a>.</p>`),
  });
  res.json({ ok: true });
}));

/* ------------------------------------------------- contact form (Contact Us page) */
// same fields as the certifiedortho.com Contact Us form: Name, Email*, Phone, Message
r.post('/contact', formLimiter, wrap(async (req, res) => {
  const b = req.body || {};
  const d = { name: str(b.name, 200), email: str(b.email, 200).toLowerCase(), phone: str(b.phone, 60), message: str(b.message, 4000) };
  if (!isEmail(d.email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
  if (Number(b.elapsed) > 0 && Number(b.elapsed) < 2000) return res.json({ ok: true });
  await sendMail({
    to: config.mail.ownerEmail,
    kind: 'contact',
    subject: `Website message from ${d.name || d.email}`,
    html: layout('New message from the Contact Us page', `<table style="font-size:14px">${Object.entries({ Name: d.name, Email: d.email, Phone: d.phone, Message: d.message })
      .map(([k, v]) => `<tr><td style="padding:4px 10px 4px 0;color:#51617d;vertical-align:top">${k}</td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`),
  });
  res.json({ ok: true });
}));

r.get('/account-requests/options', (_req, res) => res.json({ hearAbout: HEAR_ABOUT }));

export default r;
