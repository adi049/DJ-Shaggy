import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Load .env without a dependency. Existing hosting environment variables win.
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value.replace(/\\n/g, '\n');
  }
}
loadDotEnv();

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const API_DIR = path.join(ROOT, 'api');
const DIST_DIR = path.join(ROOT, 'dist');
const apiHandlers = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

function sendJson(res, status, body) {
  if (res.writableEnded) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw Object.assign(new Error('Request body exceeds 8 MB'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if ((req.headers['content-type'] || '').includes('application/json')) {
    try { return JSON.parse(raw); }
    catch { throw Object.assign(new Error('Invalid JSON request body'), { status: 400 }); }
  }
  return {};
}

async function loadHandler(name) {
  if (!apiHandlers.has(name)) {
    const file = path.join(API_DIR, name + '.js');
    if (!file.startsWith(API_DIR + path.sep) || !fs.existsSync(file)) return null;
    const mod = await import(pathToFileURL(file).href);
    if (typeof mod.default !== 'function') throw new Error('API handler has no default export');
    apiHandlers.set(name, mod.default);
  }
  return apiHandlers.get(name);
}

async function handleApi(req, res, url) {
  const route = decodeURIComponent(url.pathname.slice('/api/'.length)).replace(/\/+$/, '');
  if (!route || route.includes('..') || route.includes('/')) return sendJson(res, 404, { error: 'API route not found' });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    return sendJson(res, 503, { error: 'Server configuration missing: set NEXT_PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL) in the hosting environment.' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 503, { error: 'Server configuration missing: set SUPABASE_SERVICE_ROLE_KEY in the hosting environment. Never put this key in VITE_ variables.' });
  }

  try {
    const handler = await loadHandler(route);
    if (!handler) return sendJson(res, 404, { error: 'API route not found' });
    req.query = Object.fromEntries(url.searchParams.entries());
    req.body = await readBody(req);
    req.path = url.pathname;

    let statusCode = 200;
    const responseShim = {
      status(code) { statusCode = code; return this; },
      setHeader(name, value) { res.setHeader(name, value); return this; },
      getHeader(name) { return res.getHeader(name); },
      json(data) {
        if (!res.writableEnded) {
          res.statusCode = statusCode;
          if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(data));
        }
        return this;
      },
      end(data) {
        if (!res.writableEnded) { res.statusCode = statusCode; res.end(data); }
        return this;
      },
    };
    await handler(req, responseShim);
    if (!res.writableEnded) sendJson(res, 204, {});
  } catch (error) {
    console.error('[api-runtime]', route, error?.stack || error);
    sendJson(res, error.status || 500, { error: error.status ? error.message : 'Internal server error' });
  }
}

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });
  const requested = decodeURIComponent(url.pathname);
  const candidate = path.resolve(DIST_DIR, '.' + requested);
  let file = candidate.startsWith(DIST_DIR + path.sep) || candidate === path.join(DIST_DIR, 'index.html') ? candidate : path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(file)) return sendJson(res, 503, { error: 'Production build not found. Run npm run build before starting the production server.' });
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { return sendJson(res, 400, { error: 'Invalid URL' }); }
  if (url.pathname === '/healthz') return sendJson(res, 200, { ok: true, service: 'dj-shaggy-node', timestamp: new Date().toISOString() });
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => console.log('[dj-shaggy] server listening on ' + HOST + ':' + PORT));
server.on('error', (error) => { console.error('[dj-shaggy] server failed to start', error); process.exitCode = 1; });
