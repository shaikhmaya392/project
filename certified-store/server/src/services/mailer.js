import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { Outbox } from '../models/index.js';

let transport = null;
if (config.mail.host) {
  transport = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  });
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Simple branded layout using the CRM colours (navy #0d2149 / blue #1d5bd6) */
export function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f6f8fb;font-family:Inter,Helvetica,Arial,sans-serif;color:#16233b">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:24px 0"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e3e8f0;border-radius:10px;overflow:hidden">
    <tr><td style="background:#0d2149;padding:18px 24px;color:#fff;font-size:18px;font-weight:700;letter-spacing:.5px">CERTIFIED ORTHO</td></tr>
    <tr><td style="padding:24px">
      <h1 style="font-size:20px;margin:0 0 14px">${esc(title)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:16px 24px;background:#f6f8fb;color:#51617d;font-size:12px">
      Certified Ortho · 2415 East Mulberry Street, Unit 7, Fort Collins, CO 80524 · 970-482-7116 · info@certifiedortho.com
    </td></tr>
  </table></td></tr></table></body></html>`;
}

export async function sendMail({ to, subject, html, text, kind }) {
  const entry = await Outbox.create({ to, subject, html, text, kind, sent: false });
  if (!transport) {
    console.log(`[mail] (SMTP not configured – saved to outbox) to=${to} subject="${subject}"`);
    return { queued: true, id: entry._id };
  }
  try {
    await transport.sendMail({ from: config.mail.from, to, subject, html, text });
    entry.sent = true;
    await entry.save();
    return { sent: true };
  } catch (e) {
    entry.error = e.message;
    await entry.save();
    console.error('[mail] failed', e.message);
    return { sent: false, error: e.message };
  }
}

export { esc };
