// Saves the admin's text for the Mandatory Disclosure rows. The whole set is
// written as one JSON file; older copies are removed afterwards.
import { del, put } from '@vercel/blob';
import { TEXT_PREFIX, cleanText, isAdmin, readJson, sendJson } from '../_auth.js';
import { listAll } from '../disclosure-docs.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  if (!isAdmin(req)) return sendJson(res, 401, { error: 'Please sign in again.' });
  let body = {};
  try { body = await readJson(req); } catch (e) {}
  const text = cleanText(body.values);
  try {
    const blob = await put(TEXT_PREFIX + 'values.json', JSON.stringify(text), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: true
    });
    try {
      const old = (await listAll()).filter(b => b.pathname.startsWith(TEXT_PREFIX) && b.url !== blob.url);
      if (old.length) await del(old.map(b => b.url));
    } catch (e) {}
    sendJson(res, 200, { ok: true, text });
  } catch (e) {
    sendJson(res, 500, { error: 'Could not save the text.' });
  }
}
