import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connectDb } from './lib/db.js';
import { loadCustomer } from './middleware/auth.js';
import catalog from './routes/catalog.js';
import auth from './routes/auth.js';
import orders from './routes/orders.js';
import admin from './routes/admin.js';
import { retryPendingOrders } from './services/orders.js';
import staticCatalog from './routes/staticCatalog.js';

// Without MONGODB_URI the store runs as a read-only catalog (browse, search, product pages)
const dbConfigured = Boolean(process.env.MONGODB_URI) || !process.env.VERCEL;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', async (_req, res) => {
  if (!dbConfigured) return res.json({ ok: true, db: false, mode: 'catalog-only (set MONGODB_URI to enable accounts and orders)' });
  let error;
  try { await connectDb(); } catch (e) { error = e.message; }
  res.json({ ok: !error, db: mongoose.connection.readyState === 1, ...(error ? { error } : {}) });
});

if (!dbConfigured) app.use('/api', staticCatalog);

// Make sure MongoDB is connected before any other API route runs (serverless-safe)
app.use('/api', async (_req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (e) {
    console.error('[db]', e.message);
    res.status(503).json({ message: 'The store database is not reachable right now. Please try again or call 970-482-7116.' });
  }
});

// Vercel Cron: retry orders that could not reach the CRM yet
app.get('/api/cron/crm-retry', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ message: 'Unauthorized' });
  res.json({ ok: true, ...(await retryPendingOrders()) });
});

app.use(loadCustomer);
app.use('/api', catalog);
app.use('/api', auth);
app.use('/api/admin', admin);
app.use('/api', orders);
app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// product images / PDFs / video mirrored from certifiedortho.com (npm run mirror-media)
const mediaDir = path.join(__dirname, '../media');
if (fs.existsSync(mediaDir)) app.use('/media', express.static(mediaDir, { maxAge: '30d', immutable: true }));

// React storefront (client/dist) – on Vercel this is served by the CDN instead
const dist = path.join(__dirname, '../../client/dist');
if (!process.env.VERCEL && fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.name === 'ValidationError' || err.name === 'CastError' ? 400
    : err.name === 'MulterError' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again or call 970-482-7116.' : err.message });
});

export default app;
