/**
 * Talks to the existing CRM (crmcertifiedortho.com, React + Express + MongoDB)
 * through its own REST API only – the CRM code is not modified.
 *
 * The store signs in with a CRM user created for it (CRM > Users) and then:
 *   - forwards "request an account" forms to the CRM public leads endpoint
 *   - creates a CRM Quote for every store order (Quotes > convert to Work Order > Invoice)
 *   - reads the customer's quotes / work orders / invoices / payments / shipments
 *     for the customer portal
 */
import { config } from '../config.js';

let token = null;
let tokenAt = 0;

export class CrmError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const crmConfigured = () => config.crm.enabled && !!config.crm.email && !!config.crm.password;

async function login() {
  const r = await fetch(`${config.crm.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.crm.email, password: config.crm.password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.token) throw new CrmError(data.message || `CRM login failed (${r.status})`, r.status, data);
  token = data.token;
  tokenAt = Date.now();
  return token;
}

async function request(method, path, { body, params, raw, form } = {}, retried = false) {
  if (!crmConfigured()) throw new CrmError('CRM connection is not configured (CRM_SERVICE_EMAIL / CRM_SERVICE_PASSWORD).', 503);
  if (!token || Date.now() - tokenAt > 6 * 60 * 60 * 1000) await login();
  const url = new URL(`${config.crm.baseUrl}/api${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.set(k, v));
  const headers = { Authorization: `Bearer ${token}` };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const r = await fetch(url, { method, headers, body: payload });
  if (r.status === 401 && !retried) {
    token = null;
    return request(method, path, { body, params, raw, form }, true);
  }
  if (raw) {
    if (!r.ok) throw new CrmError(`CRM ${method} ${path} failed (${r.status})`, r.status);
    return r;
  }
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new CrmError((data && data.message) || `CRM ${method} ${path} failed (${r.status})`, r.status, data);
  return data;
}

export const crm = {
  get: (p, params) => request('GET', p, { params }),
  post: (p, body) => request('POST', p, { body }),
  patch: (p, body) => request('PATCH', p, { body }),
  raw: (p, params) => request('GET', p, { params, raw: true }),

  async ping() {
    await login();
    return { ok: true };
  },

  /** certifiedortho.com form → CRM Leads (public endpoint, no login needed) */
  async createPublicLead(lead) {
    if (!config.crm.enabled) throw new CrmError('CRM disabled', 503);
    const r = await fetch(`${config.crm.baseUrl}${config.crm.publicLeadsPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new CrmError(data.message || `CRM lead failed (${r.status})`, r.status, data);
    return data;
  },

  listAccounts: () => request('GET', '/accounts'),
  async getAccount(id) {
    const d = await request('GET', `/accounts/${id}/overview`);
    return d.account || d;
  },
  listProducts: () => request('GET', '/products'),

  /** Same payload the CRM "New quote" screen sends */
  createQuote(q) {
    return request('POST', '/quotes', { body: q });
  },

  async attachFiles({ account, quote, files, note }) {
    const form = new FormData();
    for (const f of files) form.append('files', new Blob([f.buffer], { type: f.mime }), f.originalName);
    form.append('account', account);
    form.append('source', 'quote');
    form.append('quote', quote);
    form.append('note', note || 'Attached from online store order');
    return request('POST', '/documents/bulk', { form });
  },

  quotes: (account) => request('GET', '/quotes', { params: { account } }),
  workOrders: (account) => request('GET', '/workorders', { params: { account } }),
  invoices: (account) => request('GET', '/invoices', { params: { account } }),
  shipments: (account) => request('GET', '/shipments', { params: { account } }),
  openPayments: (account) => request('GET', '/payments/open', { params: { account } }),
  documents: (params) => request('GET', '/documents', { params }),
  downloadDocument: (id) => request('GET', `/documents/${id}/download`, { raw: true }),
};

/** discount the CRM applies per product type (CRM quote form: general / custom discount %) */
export function crmDiscountFor(account, type) {
  if (!account) return 0;
  if (type === 'general') return Number(account.generalDiscountPercent) || 0;
  if (type === 'custom') return Number(account.customDiscountPercent) || 0;
  return 0;
}

const idOf = (v) => (v && typeof v === 'object' ? v._id : v);
export { idOf };
