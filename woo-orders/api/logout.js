import { clearSessionCookie, sendJson } from './_lib.js';

export default function handler(req, res) {
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
}
