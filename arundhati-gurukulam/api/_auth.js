// Shared helpers for the disclosure admin API. Files starting with "_" are not
// deployed as routes by Vercel.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'ag_admin';
const SESSION_SECONDS = 8 * 60 * 60;

// Rows of the Mandatory Disclosure page (section letter + row number; the
// staff cadre rows under D4 add PGT / TGT / PRT). Every row can take a PDF and
// has text the admin can change. Must match the page and the admin page.
export const ROW_KEYS = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12',
  'C1', 'C2', 'C3', 'C4', 'C5',
  'D1', 'D2', 'D3', 'D4', 'D4PGT', 'D4TGT', 'D4PRT', 'D5', 'D6', 'D7',
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'
];
// The "Photographs of the school" slots under section E.
export const PHOTO_KEYS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
export const DOC_KEYS = [...ROW_KEYS, ...PHOTO_KEYS];
// Staff rows have a second text, the number / strength column.
export const TEXT_KEYS = [...ROW_KEYS, ...ROW_KEYS.filter(k => k[0] === 'D').map(k => k + '.count')];
export const PREFIX = 'disclosure/';
// Saved text lives in one JSON file; "_" keeps it apart from the row folders.
export const TEXT_PREFIX = PREFIX + '_text/';
export const MAX_TEXT = 1000;

// What may be uploaded for a row: PDFs, or photos for the photo slots.
export function fileRule(key) {
  if (PHOTO_KEYS.includes(key)) {
    return { types: ['image/jpeg', 'image/png', 'image/webp'], ext: /\.(jpe?g|png|webp)$/i, maxBytes: 15 * 1024 * 1024, kind: 'photo' };
  }
  return { types: ['application/pdf'], ext: /\.pdf$/i, maxBytes: 40 * 1024 * 1024, kind: 'PDF' };
}

// Keeps only known keys with string values, trimmed and length-capped.
export function cleanText(values) {
  const out = {};
  if (!values || typeof values !== 'object') return out;
  for (const k of TEXT_KEYS) {
    if (typeof values[k] === 'string') out[k] = values[k].trim().slice(0, MAX_TEXT);
  }
  return out;
}

export function adminConfig() {
  const user = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.ADMIN_SESSION_SECRET || password;
  return { user, password, secret, ready: !!password && !!process.env.BLOB_READ_WRITE_TOKEN };
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function sameText(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkCredentials(user, password) {
  const cfg = adminConfig();
  if (!cfg.password) return false;
  // Compare both fields every time so timing does not reveal which one failed.
  const u = sameText(user || '', cfg.user);
  const p = sameText(password || '', cfg.password);
  return u && p;
}

export function sessionCookie() {
  const { secret } = adminConfig();
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const value = exp + '.' + sign(exp, secret);
  return `${COOKIE}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isAdmin(req) {
  const { secret, password } = adminConfig();
  if (!password) return false;
  const raw = String(req.headers.cookie || '');
  const m = raw.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!m) return false;
  const [exp, mac] = m[1].split('.');
  if (!exp || !mac || !sameText(mac, sign(exp, secret))) return false;
  return Number(exp) > Date.now() / 1000;
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

// Latest upload per row, from a Vercel Blob listing.
export function latestByKey(blobs) {
  const docs = {};
  for (const b of blobs) {
    const m = b.pathname.match(/^disclosure\/([^/_][^/]*)\/(.+)$/);
    if (!m || !DOC_KEYS.includes(m[1])) continue;
    const prev = docs[m[1]];
    const at = new Date(b.uploadedAt).getTime();
    if (!prev || at > prev.at) {
      docs[m[1]] = { at, url: b.url, downloadUrl: b.downloadUrl, name: m[2], size: b.size, uploadedAt: b.uploadedAt };
    }
  }
  for (const k of Object.keys(docs)) delete docs[k].at;
  return docs;
}
