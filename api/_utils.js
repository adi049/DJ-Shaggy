import supabase from './db-client.js';
import crypto from 'crypto';

export function setCors(req, res) {
  // Same-origin browser calls don't need CORS at all. Only echo an Origin that
  // matches this deployment's host; cross-origin reads get no allow header.
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (origin && host) {
    try {
      if (new URL(origin).host === host) res.setHeader('Access-Control-Allow-Origin', origin);
    } catch { /* malformed origin → no CORS header */ }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Escape user-controlled strings before injecting into HTML email templates.
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Central admin audit trail — never throws, never stores secrets or payment data.
export async function audit(actorEmail, action, detail = '') {
  try {
    await supabase.from('admin_audit_log').insert({
      actor: String(actorEmail || 'admin').slice(0, 160),
      action: String(action).slice(0, 60),
      detail: String(detail).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, '[email]').slice(0, 300),
    });
  } catch { /* audit logging must never break the operation */ }
}

export async function getSetting(key) {
  const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}

export async function verifyAdmin(req) {
  // Central origin check: protects every admin write/read endpoint at once.
  const og = originGuard(req);
  if (!og.ok) return { ok: false, status: 403, error: og.error };
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return { ok: false, status: 401, error: 'Missing auth token' };
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, error: 'Invalid or expired session' };
  const admins = await getSetting('admin');
  const emails = (admins?.emails || []).map((e) => String(e).toLowerCase());
  if (!emails.includes((user.email || '').toLowerCase())) {
    return { ok: false, status: 403, error: 'This account is not an admin' };
  }
  return { ok: true, user };
}

// Columns safe to expose publicly (NO delivery links / drive ids).
export const PUBLIC_PRODUCT_COLS =
  'id,name,slug,description,price,original_price,track_count,tags,is_bestseller,is_featured,status,artwork_url,preview_note,genre_id,collection_id,created_at,genres(id,name,slug,accent)';

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

export function newOrderId() {
  const t = Date.now().toString(36).toUpperCase().slice(-4);
  const r = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DJS-${t}${r}`;
}

/* ---------------- Email (Resend-compatible transactional email) ---------------- */

export function brandEmail(title, inner) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0a0a0b;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#131316;border:1px solid #2a2a30;border-radius:16px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #2a2a30;background:linear-gradient(90deg,#17171c,#1c1712);">
        <span style="font-size:20px;font-weight:800;letter-spacing:2px;color:#d8b45a;">DJ SHAGGY</span>
        <span style="float:right;font-size:11px;color:#9a9aa3;letter-spacing:1px;">PREMIUM DJ PLAYLISTS</span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:20px;color:#f5f2ea;">${title}</h1>
        <div style="color:#c9ccd3;font-size:14px;line-height:1.7;">${inner}</div>
      </div>
      <div style="padding:18px 28px;border-top:1px solid #2a2a30;color:#77777f;font-size:11px;line-height:1.6;">
        This is an automated message from DJ SHAGGY. If you did not place this order, please contact support.
      </div>
    </div>
  </div></body></html>`;
}

export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'RESEND_API_KEY is not configured' };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'DJ SHAGGY <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
        }),
      });
      if (r.ok) return { sent: true };
      const t = await r.text();
      if (r.status >= 500 && attempt === 0) { await new Promise((res) => setTimeout(res, 1500)); continue; }
      return { sent: false, reason: `Resend error ${r.status}: ${t.slice(0, 300)}` };
    } catch (e) {
      if (attempt === 0) { await new Promise((res) => setTimeout(res, 1500)); continue; }
      return { sent: false, reason: e.message };
    }
  }
  return { sent: false, reason: 'Email failed after retry' };
}

/* ---------------- Google Drive helpers ---------------- */

async function serviceAccountToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const jwt = `${unsigned}.${signer.sign(sa.private_key, 'base64url')}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error_description || 'Service account auth failed');
  return j.access_token;
}

/* ---------------- Origin / CSRF guard for write endpoints ---------------- */
// Browsers always send Origin on non-GET requests. If an Origin is present it
// must match this deployment's host — cross-site POST/PUT/DELETE is rejected.
// Non-browser clients (no Origin header, e.g. curl/server-to-server) are allowed.
export function originGuard(req) {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return { ok: true };

  // Primary signal: the browser's own same-site computation (proxy/iframe-safe).
  const sfs = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (sfs === 'cross-site') return { ok: false, error: 'Cross-site write rejected' };
  if (sfs === 'same-origin' || sfs === 'same-site' || sfs === 'none') return { ok: true };

  // Fallback for browsers without Sec-Fetch-Site: Origin must be this host, a
  // deployment/preview-family host (Vercel deploy URLs, preview iframe), or an
  // explicitly allowed origin (ALLOWED_ORIGINS env, comma-separated).
  const origin = req.headers?.origin;
  if (!origin) return { ok: true }; // non-browser clients (curl, server-to-server)
  try {
    const oh = new URL(origin).host;
    const host = String(req.headers.host || '');
    if (oh === host) return { ok: true };
    const family = (h) => h.endsWith('.vercel.app') || h.endsWith('.designarena.ai') || h === 'localhost' || h === '127.0.0.1';
    if (family(oh) && family(host)) return { ok: true };
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (allowed.includes(origin) || allowed.includes(`https://${oh}`)) return { ok: true };
  } catch { /* malformed origin → reject */ }
  return { ok: false, error: 'Cross-origin write rejected' };
}

/* ---------------- Client IP (trusted proxy chain) ---------------- */
export function clientIp(req) {
  // Vercel sets x-forwarded-for; take the left-most (original client) entry.
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const real = String(req.headers['x-real-ip'] || '').trim();
  const ip = xff || real || req.socket?.remoteAddress || 'unknown';
  return /^[0-9a-fA-F:.%]{3,64}$/.test(ip) ? ip : 'unknown';
}

/* ---------------- Persistent DB-backed rate limiting ---------------- */
// Shared across serverless instances (Postgres `rate_limits` table).
// Best-effort atomicity without SQL functions: conditional window update.
export async function rateLimitDb(req, { key, limit, windowMs }) {
  const ip = clientIp(req);
  const k = `${key}:${ip}`;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: row } = await supabase.from('rate_limits')
      .select('count').eq('key', k).eq('window_start', windowStart).maybeSingle();
    const count = row?.count ?? 0;
    if (count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((new Date(windowStart).getTime() + windowMs - now) / 1000));
      return { limited: true, retryAfter };
    }
    if (row) {
      // Conditional increment: only succeeds if the count hasn't moved meanwhile.
      const { data: upd } = await supabase.from('rate_limits')
        .update({ count: count + 1 })
        .eq('key', k).eq('window_start', windowStart).eq('count', count)
        .select('key');
      if (upd?.length) return { limited: false, count: count + 1 };
      continue; // lost a race — re-read and retry once
    }
    const { error } = await supabase.from('rate_limits').insert({ key: k, window_start: windowStart, count: 1 });
    if (!error) {
      // Best-effort hygiene: drop expired windows so the table never grows unbounded.
      supabase.from('rate_limits').delete().lt('window_start', new Date(now - windowMs * 3).toISOString())
        .then(() => {}).catch(() => {});
      return { limited: false, count: 1 };
    }
    // insert conflict (concurrent first hit) → loop re-reads
  }
  return { limited: false }; // fail-open for availability, memory layer still guards floods
}

/* ---------------- Structured logging (no PII, no bodies, no secrets) ---------------- */

export function logApi(route, req, status, extra = '') {
  // Intentionally excludes headers, bodies, emails and tokens.
  const line = {
    t: new Date().toISOString(),
    route,
    method: req.method,
    status,
    ...(extra ? { note: String(extra).slice(0, 160) } : {}),
  };
  if (status >= 500) console.error('[api]', JSON.stringify(line));
  else console.log('[api]', JSON.stringify(line));
}

/* ---------------- Lightweight per-IP rate limiting (per serverless instance) ---------------- */

const rlBuckets = new Map();
export function rateLimit(req, { key = 'default', limit = 30, windowMs = 60000 } = {}) {
  const ip = clientIp(req);
  const k = `${key}:${ip}`;
  const now = Date.now();
  const hits = (rlBuckets.get(k) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    return { limited: true, retryAfter: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  rlBuckets.set(k, hits);
  if (rlBuckets.size > 5000) rlBuckets.clear();
  return { limited: false };
}

export function driveConfig() {
  const parent = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY || '';
  let sa = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try { sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); } catch { sa = null; }
  }
  // Individual folder mappings do NOT require the (legacy, optional) parent folder ID.
  return { parent, apiKey, sa, configured: !!(apiKey || sa) };
}

export async function driveList(query, fields) {
  const cfg = driveConfig();
  const params = new URLSearchParams({ q: query, fields, pageSize: '200', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
  const headers = {};
  let url = `https://www.googleapis.com/drive/v3/files?${params}`;
  if (cfg.sa) {
    headers.Authorization = `Bearer ${await serviceAccountToken(cfg.sa)}`;
  } else if (cfg.apiKey) {
    url += `&key=${cfg.apiKey}`;
  } else {
    throw new Error('Google Drive is not configured');
  }
  const r = await fetch(url, { headers });
  const j = await r.json();
  if (!r.ok) {
    const msg = j?.error?.message || `Drive API error ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return j.files || [];
}

// Authenticated Drive request with token caching + 429 backoff. Throws with .status.
export async function driveFetchJson(params, cfg, attempt = 0) {
  const headers = {};
  let url = `https://www.googleapis.com/drive/v3/files?${params}`;
  if (cfg.sa) {
    if (!cfg._token) cfg._token = await serviceAccountToken(cfg.sa);
    headers.Authorization = `Bearer ${cfg._token}`;
  } else if (cfg.apiKey) {
    url += `&key=${cfg.apiKey}`;
  } else {
    const err = new Error('Google Drive is not configured');
    err.status = 400;
    throw err;
  }
  const r = await fetch(url, { headers });
  if (r.status === 429 && attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    return driveFetchJson(params, cfg, attempt + 1);
  }
  if (r.status === 401 && cfg.sa && attempt === 0) {
    cfg._token = null; // expired token: refresh once
    return driveFetchJson(params, cfg, 1);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(j?.error?.message || `Drive API error ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return j;
}
