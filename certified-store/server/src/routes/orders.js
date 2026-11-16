import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CatalogRow, Order, nextSeq } from '../models/index.js';
import { wrap, str, money } from '../utils/http.js';
import { requireCustomer } from '../middleware/auth.js';
import { crm, crmConfigured, crmDiscountFor, idOf } from '../services/crm.js';
import { syncOrderToCrm } from '../services/orders.js';
import { sendMail, layout, esc } from '../services/mailer.js';
import { config } from '../config.js';

const r = Router();
fs.mkdirSync(config.uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).slice(0, 10)}`),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 10 },
});

r.use(requireCustomer);

/** Account details from the CRM for checkout: ship-to addresses + the customer's discounts */
r.get('/checkout', wrap(async (req, res) => {
  const c = req.customer;
  if (!c.crmAccountId || !crmConfigured()) {
    return res.json({ linked: !!c.crmAccountId, account: null });
  }
  try {
    const a = await crm.getAccount(c.crmAccountId);
    res.json({
      linked: true,
      account: {
        name: a.name,
        customerId: a.customerId,
        currency: a.currency || 'USD',
        billTo: a.billTo || null,
        shipTos: (a.shipTos || []).map((s) => ({
          company: s.company || '', street: s.street || '', street2: s.street2 || '', city: s.city || '',
          state: s.state || '', zip: s.zip || '', phone: s.phone || '', fax: s.fax || '',
        })),
        discounts: { general: crmDiscountFor(a, 'general'), custom: crmDiscountFor(a, 'custom'), thirdparty: 0 },
      },
    });
  } catch (e) {
    res.json({ linked: true, account: null, error: 'Could not load your account details right now.' });
  }
}));

r.post('/orders', upload.array('files', 10), wrap(async (req, res) => {
  let body = req.body;
  if (typeof body.data === 'string') body = JSON.parse(body.data);
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return res.status(400).json({ message: 'Your cart is empty.' });
  if (items.length > 200) return res.status(400).json({ message: 'Too many lines in one order.' });

  // prices always come from the catalog (CRM price list), never from the browser
  const pns = [...new Set(items.map((i) => str(i.partNumber, 60)))];
  const rows = await CatalogRow.find({ kind: 'product', partNumber: { $in: pns }, active: true }).lean();
  const byPn = new Map(rows.map((x) => [x.partNumber, x]));

  let discounts = { general: 0, custom: 0, thirdparty: 0 };
  let shipTo = null;
  if (req.customer.crmAccountId && crmConfigured()) {
    try {
      const a = await crm.getAccount(req.customer.crmAccountId);
      discounts = { general: crmDiscountFor(a, 'general'), custom: crmDiscountFor(a, 'custom'), thirdparty: 0 };
      const idx = Number(body.shipToIndex) || 0;
      shipTo = (a.shipTos || [])[idx] || (a.shipTos || [])[0] || null;
    } catch { /* CRM unavailable – order is kept and synced later */ }
  }

  const lines = [];
  for (const i of items) {
    const row = byPn.get(str(i.partNumber, 60));
    const qty = Math.max(1, Math.min(9999, parseInt(i.qty, 10) || 1));
    if (!row) return res.status(400).json({ message: `Product ${i.partNumber} is no longer available.` });
    lines.push({
      partNumber: row.partNumber,
      name: row.name,
      unit: row.unit,
      type: row.type,
      qty,
      listPrice: row.price ?? null,
      priceLabel: row.priceLabel || '',
      discountPercent: discounts[row.type] || 0,
      comment: str(i.comment, 500),
      crmId: row.crmId,
      page: row.page,
    });
  }
  const subtotal = lines.reduce((s, l) => s + (l.listPrice || 0) * l.qty, 0);
  const estimatedTotal = lines.reduce((s, l) => s + (l.listPrice || 0) * l.qty * (1 - (l.discountPercent || 0) / 100), 0);
  const orderNumber = `WEB-${await nextSeq('order', 10000)}`;
  const order = await Order.create({
    orderNumber,
    customer: req.customer._id,
    crmAccountId: req.customer.crmAccountId,
    items: lines,
    subtotal: Math.round(subtotal * 100) / 100,
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    hasUnpricedItems: lines.some((l) => l.listPrice == null),
    poNumber: str(body.poNumber, 100),
    patientName: str(body.patientName, 200),
    note: str(body.note, 4000),
    shipTo,
    files: (req.files || []).map((f) => ({ originalName: f.originalname, storedName: f.filename, size: f.size, mime: f.mimetype })),
    status: 'Submitted',
    crm: { synced: false, attempts: 0 },
  });

  const synced = await syncOrderToCrm(order._id);

  const rowsHtml = lines.map((l) => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e3e8f0;font-family:monospace">${esc(l.partNumber)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e3e8f0">${esc(l.name)}${l.comment ? `<br><span style="color:#51617d;font-size:12px">${esc(l.comment)}</span>` : ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e3e8f0;text-align:right">${l.qty} ${esc(l.unit)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e3e8f0;text-align:right">${l.listPrice == null ? esc(l.priceLabel || 'Quoted') : money(l.listPrice)}</td></tr>`).join('');
  const table = `<table cellspacing="0" style="width:100%;font-size:13px;border-collapse:collapse"><tr style="background:#f6f8fb">
      <th align="left" style="padding:6px 8px">Product ID</th><th align="left" style="padding:6px 8px">Description</th><th align="right" style="padding:6px 8px">Qty</th><th align="right" style="padding:6px 8px">List price</th></tr>${rowsHtml}</table>
      <p style="text-align:right">List total: <b>${money(subtotal)}</b>${lines.some((l) => l.discountPercent) ? `<br>With your account discount: <b>${money(estimatedTotal)}</b>` : ''}</p>`;

  await sendMail({
    to: req.customer.email,
    kind: 'order-confirmation',
    subject: `Order ${orderNumber} received – Certified Ortho`,
    html: layout(`Thank you for your order ${orderNumber}`, `<p>Hi ${esc(req.customer.name || '')},</p>
      <p>We received your order. Our team will review it and send your invoice by email. You can follow the status any time in <a href="${config.storeUrl}/account/orders">My Account</a>.</p>
      ${order.poNumber ? `<p>P.O #: <b>${esc(order.poNumber)}</b></p>` : ''}${order.patientName ? `<p>Patient: <b>${esc(order.patientName)}</b></p>` : ''}
      ${table}`),
  });
  await sendMail({
    to: config.mail.ownerEmail,
    kind: 'order-owner',
    subject: `New online store order ${orderNumber} – ${req.customer.businessName || req.customer.email}`,
    html: layout(`New order ${orderNumber}`, `<p><b>${esc(req.customer.businessName || '')}</b> (${esc(req.customer.email)}) placed an order.</p>
      <p>${synced.crm.synced ? `It was added to the CRM as <b>Quote ${esc(synced.crm.quoteNumber || '')}</b>. Open CRM &gt; Quotes to process it.` : `<b style="color:#c22f3e">It could not be added to the CRM yet: ${esc(synced.crm.error)}</b> – the store will retry automatically, or use Store Admin &gt; Orders &gt; Send to CRM.`}</p>
      ${order.poNumber ? `<p>P.O #: ${esc(order.poNumber)}</p>` : ''}${order.patientName ? `<p>Patient: ${esc(order.patientName)}</p>` : ''}${order.note ? `<p>Note: ${esc(order.note)}</p>` : ''}
      ${table}`),
  });

  res.status(201).json({ order: { id: order._id, orderNumber, crmSynced: synced.crm.synced } });
}));

/* ------------------------------------------------------------------ portal */

const pickWO = (wos, quote, order) => wos.find((w) =>
  (quote && (idOf(w.quote) === quote._id || w.workOrderNumber === quote.quoteNumber)) ||
  (order?.crm?.quoteNumber && w.workOrderNumber === order.crm.quoteNumber));
const pickInvoices = (invs, wo) => (wo ? invs.filter((i) => idOf(i.workOrder) === wo._id || (i.workOrderNumber && i.workOrderNumber === wo.workOrderNumber)) : []);

async function crmHistory(accountId) {
  const safe = (p) => p.catch(() => []);
  const [quotes, workOrders, invoices, shipments] = await Promise.all([
    safe(crm.quotes(accountId)), safe(crm.workOrders(accountId)), safe(crm.invoices(accountId)), safe(crm.shipments(accountId)),
  ]);
  return { quotes: quotes || [], workOrders: workOrders || [], invoices: invoices || [], shipments: shipments || [] };
}

const lite = {
  quote: (q) => q && ({ id: q._id, number: q.quoteNumber, status: q.status, total: q.total, date: q.createdAt, sentAt: q.sentAt, poNumber: q.poNumber, patientName: q.patientName }),
  wo: (w) => w && ({ id: w._id, number: w.workOrderNumber, status: w.status, total: w.total, date: w.createdAt, poNumber: w.poNumber, patientName: w.patientName }),
  inv: (i) => i && ({
    id: i._id, number: i.invoiceNumber, status: i.status, total: i.total, balance: i.balance, amountPaid: i.amountPaid,
    date: i.date || i.createdAt, dueDate: i.dueDate, sentAt: i.sentAt, poNumber: i.poNumber, patientName: i.patientName,
    trackingNumber: i.trackingNumber, carrier: i.carrier, workOrderNumber: i.workOrderNumber,
    items: (i.items || []).map((x) => ({ productNumber: x.productNumber, description: x.description, quantity: x.quantity, unitPrice: x.unitPrice, discountPercent: x.discountPercent, unit: x.unit })),
  }),
  ship: (s) => s && ({ id: s._id, status: s.status, carrier: s.carrier, trackingNumber: s.trackingNumber, date: s.shipDate || s.createdAt, workOrder: idOf(s.workOrder) }),
};

/** Order progress shown to the customer, derived from the CRM records */
function progress(order, quote, wo, invs) {
  const inv = invs[0];
  if (inv) {
    if (inv.status === 'Paid') return { step: 'Paid', tone: 'green' };
    if (inv.status === 'Partially Paid') return { step: 'Partially Paid', tone: 'amber' };
    if (inv.status === 'Overdue') return { step: 'Invoice overdue', tone: 'red' };
    return { step: 'Invoiced', tone: 'blue' };
  }
  if (wo) {
    if (['Shipped', 'Completed'].includes(wo.status)) return { step: wo.status, tone: 'navy' };
    if (wo.status === 'Cancelled') return { step: 'Cancelled', tone: 'red' };
    return { step: wo.status ? `Processing – ${wo.status}` : 'Processing', tone: 'blue' };
  }
  if (quote) {
    if (quote.status === 'Declined') return { step: 'Declined', tone: 'red' };
    return { step: 'Received – being reviewed', tone: 'gray' };
  }
  return { step: order?.crm?.synced ? 'Received' : 'Submitted', tone: 'gray' };
}

r.get('/orders', wrap(async (req, res) => {
  const orders = await Order.find({ customer: req.customer._id }).sort({ createdAt: -1 }).lean();
  let hist = null;
  if (req.customer.crmAccountId && crmConfigured()) hist = await crmHistory(req.customer.crmAccountId);
  res.json(orders.map((o) => {
    const quote = hist?.quotes.find((q) => q._id === o.crm?.quoteId);
    const wo = hist ? pickWO(hist.workOrders, quote, o) : null;
    const invs = hist ? pickInvoices(hist.invoices, wo) : [];
    return {
      id: o._id, orderNumber: o.orderNumber, date: o.createdAt, poNumber: o.poNumber, patientName: o.patientName,
      itemCount: o.items.reduce((s, i) => s + i.qty, 0), lines: o.items.length, subtotal: o.subtotal, estimatedTotal: o.estimatedTotal,
      progress: progress(o, quote, wo, invs), invoice: lite.inv(invs[0]),
    };
  }));
}));

r.get('/orders/:id', wrap(async (req, res) => {
  const o = await Order.findOne({ _id: req.params.id, customer: req.customer._id }).lean();
  if (!o) return res.status(404).json({ message: 'Order not found' });
  let quote = null; let wo = null; let invs = []; let ships = [];
  if (req.customer.crmAccountId && crmConfigured()) {
    const hist = await crmHistory(req.customer.crmAccountId);
    quote = hist.quotes.find((q) => q._id === o.crm?.quoteId) || null;
    wo = pickWO(hist.workOrders, quote, o) || null;
    invs = pickInvoices(hist.invoices, wo);
    ships = wo ? hist.shipments.filter((s) => idOf(s.workOrder) === wo._id) : [];
  }
  res.json({
    id: o._id, orderNumber: o.orderNumber, date: o.createdAt, poNumber: o.poNumber, patientName: o.patientName, note: o.note,
    shipTo: o.shipTo, items: o.items, subtotal: o.subtotal, estimatedTotal: o.estimatedTotal, hasUnpricedItems: o.hasUnpricedItems,
    files: (o.files || []).map((f) => ({ name: f.originalName, size: f.size })),
    progress: progress(o, quote, wo, invs),
    timeline: [
      { label: 'Order placed', done: true, date: o.createdAt, detail: o.orderNumber },
      { label: 'Received by Certified Ortho', done: !!o.crm?.synced, date: quote?.createdAt, detail: quote ? `Quote ${quote.quoteNumber}` : '' },
      { label: 'In production / processing', done: !!wo, date: wo?.createdAt, detail: wo ? `Work order ${wo.workOrderNumber}${wo.status ? ` – ${wo.status}` : ''}` : '' },
      { label: 'Shipped', done: ships.length > 0 || ['Shipped', 'Completed'].includes(wo?.status), date: ships[0]?.shipDate || ships[0]?.createdAt, detail: ships[0]?.trackingNumber ? `${ships[0].carrier || ''} ${ships[0].trackingNumber}`.trim() : '' },
      { label: 'Invoiced', done: invs.length > 0, date: invs[0]?.createdAt, detail: invs[0] ? `Invoice ${invs[0].invoiceNumber}` : '' },
      { label: 'Paid', done: invs.length > 0 && invs.every((i) => i.status === 'Paid'), date: null, detail: invs[0] ? (invs[0].status === 'Paid' ? 'Paid in full' : `Balance ${money(invs[0].balance)}`) : '' },
    ],
    quote: lite.quote(quote), workOrder: lite.wo(wo), invoices: invs.map(lite.inv), shipments: ships.map(lite.ship),
  });
}));

/** Full account history from the CRM (also orders placed by phone/fax before the store) */
r.get('/portal', wrap(async (req, res) => {
  const c = req.customer;
  const storeOrders = await Order.countDocuments({ customer: c._id });
  if (!c.crmAccountId || !crmConfigured()) {
    return res.json({ linked: !!c.crmAccountId, storeOrders, quotes: [], workOrders: [], invoices: [], shipments: [], summary: null });
  }
  const hist = await crmHistory(c.crmAccountId);
  let account = null;
  try { account = await crm.getAccount(c.crmAccountId); } catch { /* ignore */ }
  const invoices = hist.invoices.map(lite.inv).sort((a, b) => new Date(b.date) - new Date(a.date));
  const openBalance = invoices.reduce((s, i) => s + (Number(i.balance) || 0), 0);
  res.json({
    linked: true,
    storeOrders,
    account: account && { name: account.name, customerId: account.customerId, billTo: account.billTo, shipTos: account.shipTos },
    summary: {
      openBalance: Math.round(openBalance * 100) / 100,
      unpaidInvoices: invoices.filter((i) => Number(i.balance) > 0).length,
      overdue: invoices.filter((i) => i.status === 'Overdue').length,
      inProgress: hist.workOrders.filter((w) => !['Completed', 'Shipped', 'Cancelled'].includes(w.status)).length,
    },
    quotes: hist.quotes.map(lite.quote).sort((a, b) => new Date(b.date) - new Date(a.date)),
    workOrders: hist.workOrders.map(lite.wo).sort((a, b) => new Date(b.date) - new Date(a.date)),
    invoices,
    shipments: hist.shipments.map(lite.ship),
  });
}));

/** Invoice / work-order documents (e.g. the invoice PDF) stored in the CRM */
r.get('/portal/documents', wrap(async (req, res) => {
  const c = req.customer;
  if (!c.crmAccountId || !crmConfigured()) return res.json([]);
  const params = {};
  for (const k of ['invoice', 'workOrder', 'quote']) if (req.query[k]) params[k] = str(req.query[k], 40);
  if (!Object.keys(params).length) return res.json([]);
  const docs = await crm.documents(params).catch(() => []);
  res.json((docs || []).filter((d) => idOf(d.account) === c.crmAccountId).map((d) => ({ id: d._id, title: d.title || d.name, createdAt: d.createdAt })));
}));

r.get('/portal/documents/:id/download', wrap(async (req, res) => {
  const c = req.customer;
  if (!c.crmAccountId) return res.status(404).end();
  // make sure the document belongs to this customer's account
  const all = await crm.documents({ account: c.crmAccountId }).catch(() => []);
  const doc = (all || []).find((d) => d._id === req.params.id && idOf(d.account) === c.crmAccountId);
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  const r2 = await crm.downloadDocument(doc._id);
  res.setHeader('Content-Type', r2.headers.get('content-type') || 'application/octet-stream');
  const cd = r2.headers.get('content-disposition');
  if (cd) res.setHeader('Content-Disposition', cd);
  res.send(Buffer.from(await r2.arrayBuffer()));
}));

export default r;
