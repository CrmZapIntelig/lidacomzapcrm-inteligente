import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist-offline');
const port = Number(process.env.OFFLINE_PREVIEW_PORT ?? '4178');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('INVALID_LOCAL_PORT');
const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; media-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const server = createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) { res.writeHead(403); res.end(); return; }
  if (!['GET', 'HEAD'].includes(req.method ?? '')) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', `http://127.0.0.1:${port}`).pathname);
    const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!target.startsWith(root + sep) || !types[extname(target)] || !(await stat(target)).isFile()) { res.writeHead(404); res.end(); return; }
    const body = await readFile(target); res.setHeader('Content-Type', types[extname(target)]); res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Offline preview: http://127.0.0.1:${port}/ (static synthetic bundle only)`));
