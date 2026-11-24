import supabase from './db-client.js';
import { setCors, verifyAdmin, rateLimit, logApi } from './_utils.js';

const CONTENT_BUCKET = 'content'; // private bucket: purchased files live here, never public
const SIGN_TTL = 120; // seconds

/*
 * Protected content delivery.
 *
 * Public (customer): GET /api/stream?order=<ID>&email=<email>&product=<productId>
 *   - verifies the order exists, belongs to that email, is paid AND delivered
 *   - verifies the product was actually purchased (directly or inside a bundle)
 *   - returns short-lived signed URLs (120 s) for that product's private files
 *
 * Admin: GET /api/stream?action=list&product=<id> — lists a product's hosted files.
 *
 * Honest limitation: once a customer downloads a file, it can be copied \u2014 no web
 * delivery model prevents that. This layer removes permanent public URLs, keeps
 * files out of listings/search engines, and gates every access on a verified order.
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rl = rateLimit(req, { key: 'stream', limit: 30, windowMs: 60000 });
    if (rl.limited) return res.status(429).json({ error: `Too many requests — retry in ${rl.retryAfter}s` });

    // Admin: list hosted content files for a product.
    if (req.query.action === 'list') {
      const a = await verifyAdmin(req);
      if (!a.ok) return res.status(a.status).json({ error: a.error });
      const pid = parseInt(req.query.product, 10);
      if (!pid) return res.status(400).json({ error: 'product is required' });
      const { data, error } = await supabase.storage.from(CONTENT_BUCKET).list(`products/${pid}`, { limit: 500 });
      if (error) throw error;
      return res.status(200).json((data || []).filter((f) => f.name !== '.emptyFolderPlaceholder').map((f) => ({
        name: f.name, size: f.metadata?.size || 0, path: `products/${pid}/${f.name}`, updated: f.updated_at,
      })));
    }

    const orderId = String(req.query.order || '').toUpperCase().trim();
    const email = String(req.query.email || '').toLowerCase().trim();
    const productId = parseInt(req.query.product || '0', 10);
    if (!orderId || !email || !productId) return res.status(400).json({ error: 'order, email and product are required' });

    const { data: order } = await supabase.from('orders')
      .select('id,email,items,payment_status,delivery_status')
      .eq('id', orderId).eq('email', email).maybeSingle();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status !== 'verified' || order.delivery_status !== 'delivered') {
      return res.status(403).json({ error: 'Content unlocks after payment verification and delivery' });
    }

    // Purchased directly, or inside a purchased bundle?
    let purchased = (order.items || []).some((i) => i.type === 'product' && i.id === productId);
    if (!purchased) {
      const bundleIds = (order.items || []).filter((i) => i.type === 'bundle').map((i) => i.id);
      if (bundleIds.length) {
        const { data: bundles } = await supabase.from('bundles').select('product_ids').in('id', bundleIds);
        purchased = (bundles || []).some((b) => (b.product_ids || []).includes(productId));
      }
    }
    if (!purchased) return res.status(403).json({ error: 'This product was not part of that order' });

    const { data: files, error } = await supabase.storage.from(CONTENT_BUCKET).list(`products/${productId}`, { limit: 500 });
    if (error) throw error;
    const real = (files || []).filter((f) => f.name !== '.emptyFolderPlaceholder');
    if (!real.length) {
      return res.status(404).json({ error: 'This product is delivered via its Google Drive link \u2014 check your delivery email.' });
    }

    const paths = real.map((f) => `products/${productId}/${f.name}`);
    const { data: signed, error: signErr } = await supabase.storage.from(CONTENT_BUCKET).createSignedUrls(paths, SIGN_TTL);
    if (signErr) throw signErr;
    logApi('stream', req, 200, `signed ${paths.length} file(s) for order ${orderId}`);
    return res.status(200).json({
      expires_in: SIGN_TTL,
      files: real.map((f, i) => ({ name: f.name, size: f.metadata?.size || 0, url: signed?.[i]?.signedUrl || null })),
    });
  } catch (err) {
    logApi('stream', req, 500, err.message);
    res.status(500).json({ error: 'Could not prepare secure links' });
  }
}
