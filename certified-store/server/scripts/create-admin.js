/**
 * Create / update a store admin (Certified Ortho staff).
 *   npm run create-admin -- owner@certifiedortho.com "Owner Name" "StrongPassword123"
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { Admin } from '../src/models/index.js';

const [email, name, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.log('Usage: npm run create-admin -- <email> "<name>" "<password (8+ chars)>"');
  process.exit(1);
}
await mongoose.connect(config.mongoUri);
await Admin.findOneAndUpdate(
  { email: email.toLowerCase() },
  { email: email.toLowerCase(), name, passwordHash: await bcrypt.hash(password, 10), active: true },
  { upsert: true },
);
console.log(`Admin ${email} is ready. Log in at ${config.storeUrl}/admin`);
await mongoose.disconnect();
