// Issues short-lived Vercel Blob client-upload tokens to a signed-in admin, so
// the browser uploads the PDF straight to Blob (no 4.5 MB function body limit).
import { handleUpload } from '@vercel/blob/client';
import { DOC_KEYS, isAdmin, readJson, sendJson } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  if (!isAdmin(req)) return sendJson(res, 401, { error: 'Please sign in again.' });
  try {
    const body = await readJson(req);
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const m = pathname.match(/^disclosure\/([A-D]\d{1,2})\/[^/]+\.pdf$/i);
        if (!m || !DOC_KEYS.includes(m[1])) throw new Error('Not a disclosure document path');
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 40 * 1024 * 1024,
          addRandomSuffix: true
        };
      }
    });
    sendJson(res, 200, result);
  } catch (e) {
    sendJson(res, 400, { error: e && e.message ? e.message : 'Upload failed' });
  }
}
