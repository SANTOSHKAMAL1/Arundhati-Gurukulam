// Issues short-lived Vercel Blob client-upload tokens to a signed-in admin, so
// the browser uploads the file straight to Blob (no 4.5 MB function body limit).
import { handleUpload } from '@vercel/blob/client';
import { DOC_KEYS, fileRule, isAdmin, readJson, sendJson } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  if (!isAdmin(req)) return sendJson(res, 401, { error: 'Please sign in again.' });
  try {
    const body = await readJson(req);
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const m = pathname.match(/^disclosure\/([^/]+)\/[^/]+$/);
        if (!m || !DOC_KEYS.includes(m[1])) throw new Error('Not a disclosure document path');
        const rule = fileRule(m[1]);
        if (!rule.ext.test(pathname)) throw new Error(rule.kind === 'photo' ? 'Photos must be JPG, PNG or WebP.' : 'Only PDF files can be uploaded here.');
        return {
          allowedContentTypes: rule.types,
          maximumSizeInBytes: rule.maxBytes,
          addRandomSuffix: true
        };
      }
    });
    sendJson(res, 200, result);
  } catch (e) {
    sendJson(res, 400, { error: e && e.message ? e.message : 'Upload failed' });
  }
}
