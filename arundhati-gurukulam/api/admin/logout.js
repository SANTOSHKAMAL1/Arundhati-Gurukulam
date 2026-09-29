import { clearCookie, sendJson } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', clearCookie());
  sendJson(res, 200, { ok: true });
}
