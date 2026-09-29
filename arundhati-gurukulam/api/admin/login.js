import { adminConfig, checkCredentials, readJson, sendJson, sessionCookie } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  if (!adminConfig().password) {
    return sendJson(res, 503, { error: 'Admin sign-in is not set up yet. Add ADMIN_PASSWORD in the Vercel project settings.' });
  }
  let body = {};
  try { body = await readJson(req); } catch (e) {}
  if (!checkCredentials(body.user, body.password)) {
    await new Promise(r => setTimeout(r, 800));
    return sendJson(res, 401, { error: 'Wrong username or password.' });
  }
  res.setHeader('Set-Cookie', sessionCookie());
  sendJson(res, 200, { ok: true });
}
