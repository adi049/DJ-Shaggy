import supabase from './db-client.js';
import { setCors, verifyAdmin, slugify } from './_utils.js';

async function resolveProducts(bundles) {
  const ids = [...new Set(bundles.flatMap((b) => Array.isArray(b.product_ids) ? b.product_ids : []))];
  if (!ids.length) return bundles.map((b) => ({ ...b, products: [] }));
  const { data: products } = await supabase
    .from('products')
    .select('id,name,slug,price,original_price,track_count,artwork_url,status')
    .in('id', ids);
  const map = Object.fromEntries((products || []).map((p) => [p.id, p]));
  return bundles.map((b) => ({
    ...b,
    products: (Array.isArray(b.product_ids) ? b.product_ids : []).map((id) => map[id]).filter(Boolean),
  }));
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const all = req.query.all === '1';
      if (all) {
        const a = await verifyAdmin(req);
        if (!a.ok) return res.status(a.status).json({ error: a.error });
      }
      let q = supabase.from('bundles').select('*').order('created_at', { ascending: false });
      if (!all) q = q.eq('status', 'published');
      if (req.query.slug) q = q.eq('slug', req.query.slug);
      const { data, error } = await q;
      if (error) throw error;
      const withProducts = await resolveProducts(data || []);
      return res.status(200).json(req.query.slug ? withProducts[0] || null : withProducts);
    }

    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.name) return res.status(400).json({ error: 'Name is required' });
      const row = {
        name: b.name,
        slug: b.slug ? slugify(b.slug) : slugify(b.name),
        description: b.description || '',
        price: Math.max(0, Number(b.price) || 0),
        original_price: b.original_price ? Number(b.original_price) : null,
        artwork_url: b.artwork_url || '',
        product_ids: Array.isArray(b.product_ids) ? b.product_ids.map(Number).filter(Boolean) : [],
        status: b.status === 'published' ? 'published' : 'draft',
      };
      const { data, error } = await supabase.from('bundles').insert(row).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id is required' });
      const row = {
        name: b.name,
        slug: b.slug ? slugify(b.slug) : slugify(b.name || ''),
        description: b.description || '',
        price: Math.max(0, Number(b.price) || 0),
        original_price: b.original_price ? Number(b.original_price) : null,
        artwork_url: b.artwork_url || '',
        product_ids: Array.isArray(b.product_ids) ? b.product_ids.map(Number).filter(Boolean) : [],
        status: b.status === 'published' ? 'published' : 'draft',
      };
      const { data, error } = await supabase.from('bundles').update(row).eq('id', b.id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const { error } = await supabase.from('bundles').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('bundles API error:', err);
    res.status(500).json({ error: err.message });
  }
}
