// Public list of PDFs uploaded through the admin page, latest per row.
import { list } from '@vercel/blob';
import { PREFIX, latestByKey, sendJson } from './_auth.js';

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

export default async function handler(req, res) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return sendJson(res, 200, { docs: {} });
  try {
    sendJson(res, 200, { docs: latestByKey(await listAll()) });
  } catch (e) {
    sendJson(res, 200, { docs: {}, error: 'storage unavailable' });
  }
}
