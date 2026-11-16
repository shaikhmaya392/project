import 'dotenv/config';

const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5050),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certified_store',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  // Public URL of the store (used in emails: login link, reset link)
  storeUrl: (process.env.STORE_URL || 'http://localhost:5050').replace(/\/$/, ''),

  // ---- CRM (crmcertifiedortho.com) – no CRM code changes, only its API ----
  crm: {
    baseUrl: (process.env.CRM_URL || 'https://crmcertifiedortho.com').replace(/\/$/, ''),
    // A CRM user created for the store (CRM > Users). Used to create quotes and read
    // the customer's quotes / work orders / invoices / payments for the portal.
    email: process.env.CRM_SERVICE_EMAIL || '',
    password: process.env.CRM_SERVICE_PASSWORD || '',
    // Public endpoint already used by certifiedortho.com "Become a Certified Ortho Customer"
    publicLeadsPath: process.env.CRM_PUBLIC_LEADS_PATH || '/api/public/leads',
    enabled: bool(process.env.CRM_ENABLED, true),
  },

  // ---- Email ----
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Certified Ortho <info@certifiedortho.com>',
    // where "new account request" / "new order" notifications go
    ownerEmail: process.env.OWNER_EMAIL || 'info@certifiedortho.com',
  },

  // When "local", product images/PDFs are served from /media (after `npm run mirror-media`)
  mediaMode: process.env.MEDIA_MODE || 'remote',
  // Vercel functions can only write to /tmp (files are sent to the CRM right after the order is placed)
  uploadDir: process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/uploads' : 'uploads'),
  // Vercel limits a request body to 4.5 MB
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB || (process.env.VERCEL ? 4 : 25)) * 1024 * 1024,
};

if (config.env === 'production' && config.jwtSecret === 'change-this-secret-in-production') {
  console.warn('[config] JWT_SECRET is not set – set it in .env before going live.');
}
