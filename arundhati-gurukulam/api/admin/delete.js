// Removes uploaded files for one row. With keepUrl, removes every older upload
// for that row but keeps the one just uploaded.
import { del } from '@vercel/blob';
import { DOC_KEYS, PREFIX, isAdmin, readJson, sendJson } from '../_auth.js';
import { listAll } from '../disclosure-docs.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  if (!isAdmin(req)) return sendJson(res, 401, { error: 'Please sign in again.' });
  let body = {};
  try { body = await readJson(req); } catch (e) {}
  if (!DOC_KEYS.includes(body.key)) return sendJson(res, 400, { error: 'Unknown row' });
  try {
    const mine = (await listAll()).filter(b => b.pathname.startsWith(PREFIX + body.key + '/') && b.url !== body.keepUrl);
    if (mine.length) await del(mine.map(b => b.url));
    sendJson(res, 200, { ok: true, removed: mine.length });
  } catch (e) {
    sendJson(res, 500, { error: 'Could not remove the file.' });
  }
}
