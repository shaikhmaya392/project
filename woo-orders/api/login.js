import { makeSessionCookie, readBody, safeEqual, sendJson } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    return sendJson(res, 500, { error: 'Vercel mein ADMIN_USER aur ADMIN_PASS set nahi hain.' });
  }
  const { user, pass } = await readBody(req);
  const okUser = safeEqual(user, process.env.ADMIN_USER);
  const okPass = safeEqual(pass, process.env.ADMIN_PASS);
  if (!okUser || !okPass) {
    await new Promise(r => setTimeout(r, 800)); // password guessing ko slow karne ke liye
    return sendJson(res, 401, { error: 'Username ya password ghalat hai.' });
  }
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': makeSessionCookie(user) });
}
