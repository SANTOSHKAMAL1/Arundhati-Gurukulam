// Public list of files uploaded through the admin page (latest per row) and
// the text saved there.
import { list } from '@vercel/blob';
import { PREFIX, TEXT_PREFIX, cleanText, latestByKey, sendJson } from './_auth.js';

export async function listAll(timeoutMs = 6000) {
  const blobs = [];
  const abortSignal = AbortSignal.timeout(timeoutMs);
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000, abortSignal });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

// Most recent saved-text file, or null.
export function latestText(blobs) {
  let best = null;
  for (const b of blobs) {
    if (!b.pathname.startsWith(TEXT_PREFIX)) continue;
    if (!best || new Date(b.uploadedAt) > new Date(best.uploadedAt)) best = b;
  }
  return best;
}

async function readText(blobs) {
  const b = latestText(blobs);
  if (!b) return {};
  try {
    // Each save gets a new URL (random suffix), so a cached copy is never stale.
    const r = await fetch(b.url, { signal: AbortSignal.timeout(5000) });
    return r.ok ? cleanText(await r.json()) : {};
  } catch (e) {
    return {};
  }
}

export default async function handler(req, res) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return sendJson(res, 200, { docs: {}, text: {} });
  try {
    const blobs = await listAll();
    sendJson(res, 200, { docs: latestByKey(blobs), text: await readText(blobs) });
  } catch (e) {
    sendJson(res, 200, { docs: {}, text: {}, error: 'storage unavailable' });
  }
}
