import fs from 'node:fs/promises';
import path from 'node:path';
import { Order, Customer } from '../models/index.js';
import { crm, crmConfigured, crmDiscountFor } from './crm.js';
import { config } from '../config.js';

/** Send one store order to the CRM as a Quote (same payload as CRM > Quotes > New quote). */
export async function syncOrderToCrm(orderId) {
  const order = await Order.findById(orderId);
  if (!order || order.crm?.synced) return order;
  const customer = await Customer.findById(order.customer);
  order.crm.attempts = (order.crm.attempts || 0) + 1;
  order.crm.lastAttemptAt = new Date();
  try {
    if (!crmConfigured()) throw new Error('CRM connection is not configured');
    if (!customer?.crmAccountId) throw new Error('This store login is not linked to a CRM customer yet');
    const account = await crm.getAccount(customer.crmAccountId);
    const shipTo = order.shipTo || (account.shipTos || [])[0] || {};
    const noteLines = [
      `Online store order ${order.orderNumber}`,
      `Placed by ${customer.name || ''} <${customer.email}>`.trim(),
      order.note ? `Customer note: ${order.note}` : '',
      order.files?.length ? `Attached files: ${order.files.map((f) => f.originalName).join(', ')}` : '',
    ].filter(Boolean);
    const payload = {
      account: customer.crmAccountId,
      currency: account.currency || 'USD',
      taxRate: 0,
      items: order.items.map((i) => ({
        product: i.crmId || null,
        productNumber: i.partNumber,
        description: i.name,
        quantity: i.qty,
        unitPrice: i.listPrice ?? 0,
        discountPercent: crmDiscountFor(account, i.type),
        productType: i.type || '',
        comment: [i.priceLabel && i.listPrice == null ? `Price: ${i.priceLabel}` : '', i.comment].filter(Boolean).join(' – '),
        unit: i.unit || '',
      })),
      doctors: [],
      recipientType: 'clinician',
      poNumber: order.poNumber || '',
      patientName: order.patientName || '',
      note: noteLines.join('\n'),
      shipTos: [{
        company: shipTo.company || '', street: shipTo.street || '', street2: shipTo.street2 || '', city: shipTo.city || '',
        state: shipTo.state || '', zip: shipTo.zip || '', phone: shipTo.phone || '', fax: shipTo.fax || '',
      }],
    };
    const q = await crm.createQuote(payload);
    order.crm.synced = true;
    order.crm.quoteId = q?._id;
    order.crm.quoteNumber = q?.quoteNumber;
    order.crm.error = undefined;
    order.status = 'Received';
    // order forms / files the customer attached → CRM documents on the quote
    if (order.files?.length && q?._id) {
      try {
        const files = [];
        for (const f of order.files) {
          files.push({ ...f.toObject?.() ?? f, buffer: await fs.readFile(path.join(config.uploadDir, f.storedName)) });
        }
        await crm.attachFiles({ account: customer.crmAccountId, quote: q._id, files, note: `Attached from online store order ${order.orderNumber}` });
      } catch (e) {
        console.error('[crm] attach files failed', e.message);
      }
    }
  } catch (e) {
    order.crm.error = e.message;
  }
  await order.save();
  return order;
}

/** Retry orders that could not reach the CRM (CRM down, login not linked yet, …) */
export async function retryPendingOrders() {
  let tried = 0;
  let synced = 0;
  try {
    const pending = await Order.find({ 'crm.synced': { $ne: true }, 'crm.attempts': { $lt: 20 } }).limit(20);
    for (const o of pending) {
      const c = await Customer.findById(o.customer);
      if (c?.crmAccountId) {
        tried += 1;
        const r = await syncOrderToCrm(o._id);
        if (r?.crm?.synced) synced += 1;
      }
    }
  } catch (e) {
    console.error('[crm-retry]', e.message);
  }
  return { tried, synced };
}

/** Long-running server: retry every 10 minutes (on Vercel a daily cron calls /api/cron/crm-retry) */
export function startCrmRetryLoop() {
  setInterval(retryPendingOrders, 10 * 60 * 1000).unref();
}
