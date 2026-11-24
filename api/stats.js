import supabase from './db-client.js';
import { setCors, verifyAdmin } from './_utils.js';

async function bucketBytes(bucket, folders = ['']) {
  let total = 0;
  for (const folder of folders) {
    try {
      const { data } = await supabase.storage.from(bucket).list(folder, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
      for (const f of data || []) {
        if (f.metadata?.size) total += f.metadata.size;
      }
    } catch { /* bucket missing or empty */ }
  }
  return total;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    const [{ data: products }, { data: orders }, { data: messages }, artworkBytes, mediaBytes, paymentBytes] = await Promise.all([
      supabase.from('products').select('id,status'),
      supabase.from('orders').select('id,email,amount,payment_status,delivery_status'),
      supabase.from('messages').select('id,resolved'),
      bucketBytes('artwork', ['', 'artwork']),
      bucketBytes('media', ['', 'gallery', 'audio', 'banners']),
      bucketBytes('payments', ['', 'shots']),
    ]);

    const all = orders || [];
    const stats = {
      products_total: (products || []).length,
      products_published: (products || []).filter((p) => p.status === 'published').length,
      orders_total: all.length,
      orders_pending: all.filter((o) => o.payment_status === 'pending_verification').length,
      orders_delivered: all.filter((o) => o.delivery_status === 'delivered').length,
      revenue_verified: all.filter((o) => o.payment_status === 'verified').reduce((s, o) => s + (Number(o.amount) || 0), 0),
      customers_total: new Set(all.map((o) => o.email)).size,
      messages_open: (messages || []).filter((m) => !m.resolved).length,
      storage_bytes: artworkBytes + mediaBytes + paymentBytes,
      storage_by_bucket: { artwork: artworkBytes, media: mediaBytes, payments: paymentBytes },
    };
    return res.status(200).json(stats);
  } catch (err) {
    console.error('stats API error:', err);
    res.status(500).json({ error: err.message });
  }
}
