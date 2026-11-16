import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/* ------------------------------------------------------------------ catalog */

// One row of the CRM price list, in its exact order: section/sub headings, notes,
// kit-content lines and products (SKUs). Mirrors products-export (CRM) 1:1.
const CatalogRowSchema = new Schema({
  seq: { type: Number, index: true },
  kind: { type: String, enum: ['major', 'sub', 'note', 'product'], index: true },
  type: { type: String, enum: ['general', 'custom', 'thirdparty'], index: true },
  text: String, // heading / note / kit line text
  section: String,
  major: String,
  sub: String,
  partNumber: { type: String, index: true },
  name: String,
  price: Number, // null => use priceLabel ("NC", "N/C", "Variable") or "Call for price"
  priceLabel: String,
  unit: String,
  lines: [String], // kit contents printed under the product in the price list
  crmId: String, // CRM product _id
  page: { type: String, index: true }, // primary website page slug
  pages: [String],
  linkedBy: String, // code | family | group
  image: String, // only when the website shows this exact item
  siteCaption: String,
  active: { type: Boolean, default: true },
}, { timestamps: true });
CatalogRowSchema.index({ partNumber: 'text', name: 'text', sub: 'text', major: 'text' });

const PageSchema = new Schema({
  slug: { type: String, unique: true },
  title: String,
  parent: String,
  image: String,
  blocks: Schema.Types.Mixed, // content copied from certifiedortho.com
  skus: [String],
  sourceUrl: String,
  searchText: String,
}, { timestamps: true });
PageSchema.index({ title: 'text', searchText: 'text' });

const SettingSchema = new Schema({ key: { type: String, unique: true }, value: Schema.Types.Mixed });

/* ------------------------------------------------------------------ people */

const CustomerSchema = new Schema({
  email: { type: String, unique: true, lowercase: true, trim: true },
  name: String, // contact person
  businessName: String,
  phone: String,
  passwordHash: String,
  mustChangePassword: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  crmAccountId: String, // CRM "Customer" (account) _id – orders become quotes on this account
  crmCustomerId: String, // CRM Acct#
  accountRequest: { type: Schema.Types.ObjectId, ref: 'AccountRequest' },
  lastLoginAt: Date,
  resetToken: String,
  resetTokenExpires: Date,
  createdBy: String,
}, { timestamps: true });

const AdminSchema = new Schema({
  email: { type: String, unique: true, lowercase: true, trim: true },
  name: String,
  passwordHash: String,
  active: { type: Boolean, default: true },
}, { timestamps: true });

// "Request an account" form (same fields as certifiedortho.com "Become a Certified Ortho Customer")
const AccountRequestSchema = new Schema({
  businessName: String,
  personName: String,
  personTitle: String,
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  fax: String,
  website: String,
  hearAbout: String,
  message: String,
  cartSnapshot: [{ partNumber: String, name: String, qty: Number }],
  status: { type: String, enum: ['new', 'approved', 'rejected'], default: 'new' },
  crmLead: { ok: Boolean, error: String, at: Date },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  ip: String,
}, { timestamps: true });

/* ------------------------------------------------------------------ orders */

const OrderItemSchema = new Schema({
  partNumber: String,
  name: String,
  unit: String,
  type: String,
  qty: Number,
  listPrice: Number, // null when price is a label
  priceLabel: String,
  discountPercent: { type: Number, default: 0 },
  comment: String,
  crmId: String,
  page: String,
}, { _id: false });

const OrderSchema = new Schema({
  orderNumber: { type: String, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
  crmAccountId: String,
  items: [OrderItemSchema],
  subtotal: Number, // list price total (before customer discounts)
  estimatedTotal: Number, // after the customer's CRM discounts
  hasUnpricedItems: Boolean,
  poNumber: String,
  patientName: String,
  note: String,
  shipTo: Schema.Types.Mixed,
  files: [{ originalName: String, storedName: String, size: Number, mime: String }],
  status: { type: String, default: 'Submitted' }, // store-side status
  crm: {
    synced: { type: Boolean, default: false },
    quoteId: String,
    quoteNumber: String,
    error: String,
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
  },
}, { timestamps: true });

const CounterSchema = new Schema({ _id: String, seq: Number });

// Every email the store sends is also kept here (and is the only copy when SMTP is not configured)
const OutboxSchema = new Schema({
  to: String,
  subject: String,
  html: String,
  text: String,
  sent: Boolean,
  error: String,
  kind: String,
}, { timestamps: true });

export const CatalogRow = model('CatalogRow', CatalogRowSchema);
export const Page = model('Page', PageSchema);
export const Setting = model('Setting', SettingSchema);
export const Customer = model('Customer', CustomerSchema);
export const Admin = model('Admin', AdminSchema);
export const AccountRequest = model('AccountRequest', AccountRequestSchema);
export const Order = model('Order', OrderSchema);
export const Counter = model('Counter', CounterSchema);
export const Outbox = model('Outbox', OutboxSchema);

export async function nextSeq(name, start = 10000) {
  const c = await Counter.findOneAndUpdate(
    { _id: name },
    [{ $set: { seq: { $add: [{ $ifNull: ['$seq', start] }, 1] } } }],
    { new: true, upsert: true },
  );
  return c.seq;
}
