/**
 * Loads the catalog into MongoDB:
 *   seed/catalog.json – the CRM price list (every SKU, price, unit, heading, note)
 *   seed/pages.json   – every live certifiedortho.com page (text, images, tables, PDFs)
 * Safe to run again: it replaces catalog + pages, never touches customers/orders.
 */
import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { seedCatalog } from '../src/lib/seedData.js';

await mongoose.connect(config.mongoUri);
const s = await seedCatalog();
console.log(`Seeded ${s.products} products, ${s.other} headings/notes, ${s.pages} pages.`);
await mongoose.disconnect();
