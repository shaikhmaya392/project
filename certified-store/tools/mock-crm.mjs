/**
 * Local stand-in for the CRM API (only the endpoints the store uses), for testing the
 * store without touching the live CRM. Shapes follow crmcertifiedortho.com's API.
 *   node tools/mock-crm.mjs   (port 5099)
 */
import express from '../server/node_modules/express/index.js';

const app = express();
app.use(express.json());
const TOKEN = 'mock-token';
const db = {
  leads: [],
  accounts: [{
    _id: 'acc1', customerId: '1042', name: 'Rocky Mountain Orthotics & Prosthetics', currency: 'USD', category: 'Clinic',
    email: 'orders@rmop-demo.com', generalDiscountPercent: 10, customDiscountPercent: 5, customerDiscountPercent: 0,
    billTo: { company: 'Rocky Mountain O&P', street: '120 Pine St', city: 'Denver', state: 'CO', zip: '80202', email: 'billing@rmop-demo.com' },
    shipTos: [
      { company: 'Rocky Mountain O&P – Denver', street: '120 Pine St', city: 'Denver', state: 'CO', zip: '80202', phone: '303-555-0101' },
      { company: 'Rocky Mountain O&P – Boulder', street: '9 Canyon Blvd', city: 'Boulder', state: 'CO', zip: '80302', phone: '303-555-0199' },
    ],
  }, { _id: 'acc2', customerId: '1043', name: 'Front Range Pediatric Orthotics', currency: 'USD', shipTos: [], billTo: { city: 'Fort Collins', state: 'CO' } }],
  quotes: [], workorders: [], invoices: [], shipments: [], documents: [],
};
let qn = 5000;
const auth = (req, res, next) => (req.headers.authorization === `Bearer ${TOKEN}` ? next() : res.status(401).json({ message: 'Unauthorized' }));

app.post('/api/auth/login', (req, res) => {
  if (req.body.email === 'store@certifiedortho.com' && req.body.password === 'mock-pass') return res.json({ token: TOKEN, user: { email: req.body.email, role: 'staff' } });
  res.status(401).json({ message: 'Invalid email or password' });
});
app.post('/api/public/leads', (req, res) => {
  if (!req.body.businessName || !req.body.email) return res.status(400).json({ message: 'Missing fields' });
  db.leads.push(req.body);
  res.json({ ok: true });
});
app.get('/api/accounts', auth, (_req, res) => res.json(db.accounts));
app.get('/api/accounts/:id/overview', auth, (req, res) => {
  const a = db.accounts.find((x) => x._id === req.params.id);
  return a ? res.json({ account: a }) : res.status(404).json({ message: 'Customer not found' });
});
app.post('/api/quotes', auth, (req, res) => {
  const b = req.body;
  if (!b.account || !b.items?.length) return res.status(400).json({ message: 'Invalid quote' });
  const total = b.items.reduce((s, i) => s + i.unitPrice * i.quantity * (1 - (i.discountPercent || 0) / 100), 0);
  const q = { ...b, _id: `q${++qn}`, quoteNumber: `Q-${qn}`, status: 'Draft', total, createdAt: new Date().toISOString() };
  db.quotes.push(q);
  res.status(201).json(q);
});
for (const k of ['quotes', 'workorders', 'invoices', 'shipments']) {
  app.get(`/api/${k}`, auth, (req, res) => res.json(db[k].filter((x) => !req.query.account || (x.account?._id || x.account) === req.query.account)));
}
app.post('/api/documents/bulk', auth, (req, res) => { db.documents.push({ _id: `d${db.documents.length + 1}`, account: 'acc1', title: 'upload' }); res.json({ ok: true }); });
app.get('/api/documents', auth, (req, res) => res.json(db.documents.filter((d) => Object.entries(req.query).every(([k, v]) => d[k] === v))));
app.get('/api/documents/:id/download', auth, (req, res) => { res.type('application/pdf').send(Buffer.from('%PDF-1.4 mock invoice')); });

// test helper: simulate the CRM team processing a quote → work order → invoice → payment
app.post('/__process/:quoteId', (req, res) => {
  const q = db.quotes.find((x) => x._id === req.params.quoteId);
  if (!q) return res.status(404).end();
  q.status = 'Accepted';
  const wo = { _id: `w${q._id}`, workOrderNumber: q.quoteNumber, account: q.account, status: 'Shipped', total: q.total, poNumber: q.poNumber, createdAt: new Date().toISOString() };
  db.workorders.push(wo);
  db.shipments.push({ _id: `s${q._id}`, workOrder: wo._id, account: q.account, carrier: 'UPS', trackingNumber: '1Z999AA10123456784', status: 'Shipped', createdAt: new Date().toISOString() });
  const paid = req.query.paid === '1';
  const inv = { _id: `i${q._id}`, invoiceNumber: `INV-${q.quoteNumber.slice(2)}`, account: q.account, workOrder: wo._id, status: paid ? 'Paid' : 'Sent', total: q.total, amountPaid: paid ? q.total : 0, balance: paid ? 0 : q.total, dueDate: new Date(Date.now() + 30 * 864e5).toISOString(), createdAt: new Date().toISOString(), items: q.items.map((i) => ({ productNumber: i.productNumber, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discountPercent: i.discountPercent })) };
  db.invoices.push(inv);
  db.documents.push({ _id: `doc-${inv._id}`, account: q.account, invoice: inv._id, title: `Invoice ${inv.invoiceNumber}.pdf` });
  res.json({ ok: true, invoice: inv.invoiceNumber });
});
app.get('/__db', (_req, res) => res.json(db));

app.listen(5099, () => console.log('mock CRM on :5099'));
