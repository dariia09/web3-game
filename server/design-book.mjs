import { readFile } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { decryptPdf, parseKey } from './pdf-crypto.mjs';

const hash = value => createHash('sha256').update(value).digest();
export function createDesignHandler({ root = process.cwd(), allowLocalKey = false, env = process.env } = {}) {
  return async function handleDesignBook(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    const json = (status, data) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
    const accessCode = env.DESIGN_ACCESS_CODE || '';
    if (req.method === 'GET') return json(200, { title: 'River Club - Future Design Concepts', pages: 8, locked: !!accessCode });
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return json(405, { error: 'Method not allowed' });
    }
    // Defense in depth, not a substitute for user authentication.
    if (req.headers['sec-fetch-site'] === 'cross-site') return json(403, { error: 'Open this document from River Club.' });
    if (req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host) return json(403, { error: 'Origin not allowed' });
      } catch { return json(403, { error: 'Origin not allowed' }); }
    }
    if (accessCode) {
      const supplied = (req.headers.authorization || '').replace(/^Bearer /, '');
      if (!timingSafeEqual(hash(supplied), hash(accessCode))) return json(401, { error: 'Access code is incorrect.' });
    }
    let key;
    let plaintext;
    try {
      let encodedKey = env.DESIGN_PDF_KEY;
      if (!encodedKey && allowLocalKey) encodedKey = (await readFile(resolve(root, '.secrets/design-book.key'), 'utf8')).trim();
      key = parseKey(encodedKey);
      const ciphertext = await readFile(resolve(root, 'private/design-book.rcenc'));
      plaintext = decryptPdf(ciphertext, key);
      key.fill(0); key = undefined;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', plaintext.length);
      res.setHeader('Content-Disposition', 'inline; filename="River-Club-Design-Vision.pdf"');
      // Release the application-owned plaintext after delivery or disconnect.
      // The application never writes a decrypted file or browser storage entry.
      const release = () => { plaintext?.fill(0); plaintext = undefined; };
      res.once('finish', release); res.once('close', release);
      res.end(plaintext);
    } catch {
      key?.fill(0); plaintext?.fill(0);
      return json(503, { error: 'The design book is unavailable. Ask the owner to check the server configuration.' });
    }
  };
}
