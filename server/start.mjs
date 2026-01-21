import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { resolve, extname, sep } from 'node:path';
import { createDesignHandler } from './design-book.mjs';
try { loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const root = process.cwd();
const dist = resolve(root, 'dist');
const handle = createDesignHandler({root, allowLocalKey:true});
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.wasm':'application/wasm'};
const server = createServer(async (req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (pathname === '/api/design-book') return handle(req,res);
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end();return; }
  if (pathname.startsWith('/api/') || pathname.includes('..') || pathname.includes('\\') || pathname.split('/').some(part=>part.startsWith('.')) || /^\/(private|server|scripts)\//.test(pathname)) {res.writeHead(404).end();return;}
  const target = resolve(dist, '.' + pathname);
  if (!target.startsWith(dist + sep) && target !== dist) {res.writeHead(404).end();return;}
  try {
    const file = pathname === '/' || pathname === '/design' ? resolve(dist,'index.html') : target;
    const data = await readFile(file);
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404).end('Not found');}
});
server.listen(Number(process.env.PORT || 3000),process.env.HOST || '127.0.0.1',()=>console.log(`River Club: http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 3000}`));
