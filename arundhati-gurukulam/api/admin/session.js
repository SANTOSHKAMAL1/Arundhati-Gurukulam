import { adminConfig, isAdmin, sendJson } from '../_auth.js';

export default async function handler(req, res) {
  const cfg = adminConfig();
  sendJson(res, 200, {
    signedIn: isAdmin(req),
    passwordSet: !!cfg.password,
    storageSet: !!process.env.BLOB_READ_WRITE_TOKEN
  });
}
