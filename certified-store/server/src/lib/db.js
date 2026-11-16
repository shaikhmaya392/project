import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { CatalogRow, Admin } from '../models/index.js';
import { seedCatalog } from './seedData.js';

// One connection per serverless instance (reused between requests).
let ready = null;

async function bootstrap() {
  // Fresh database: load the catalog + pages automatically
  if ((await CatalogRow.estimatedDocumentCount()) === 0) {
    const s = await seedCatalog();
    console.log(`[bootstrap] seeded ${s.products} products, ${s.pages} pages`);
  }
  // First store admin from env (ADMIN_EMAIL / ADMIN_PASSWORD) when none exists yet
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (email && password.length >= 8 && (await Admin.estimatedDocumentCount()) === 0) {
    await Admin.create({ email, name: process.env.ADMIN_NAME || 'Store admin', passwordHash: await bcrypt.hash(password, 10), active: true });
    console.log(`[bootstrap] created admin ${email}`);
  }
}

export function connectDb() {
  if (!ready) {
    ready = mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 })
      .then(bootstrap)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}
