// Local / VPS server. On Vercel, api/index.js exports the same app as a serverless function.
import app from './app.js';
import { config } from './config.js';
import { connectDb } from './lib/db.js';
import { startCrmRetryLoop } from './services/orders.js';

await connectDb();
app.listen(config.port, () => {
  console.log(`Certified Ortho store running on http://localhost:${config.port}`);
  startCrmRetryLoop();
});
