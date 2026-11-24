import supabase from './db-client.js';
import { setCors, verifyAdmin } from './_utils.js';

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
      let q = supabase.from('gallery').select('*').order('sort_order', { ascending: true });
      if (!all) q = q.eq('published', true);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    if (req.method === 'POST') {
      const g = req.body || {};
      if (!g.image_url) return res.status(400).json({ error: 'image_url is required' });
      const row = {
        title: String(g.title || '').slice(0, 160),
        alt: String(g.alt || '').slice(0, 200),
        image_url: String(g.image_url),
        sort_order: parseInt(g.sort_order, 10) || 0,
        published: g.published !== false,
      };
      const { data, error } = await supabase.from('gallery').insert(row).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const g = req.body || {};
      if (!g.id) return res.status(400).json({ error: 'id is required' });
      const row = {
        title: String(g.title || '').slice(0, 160),
        alt: String(g.alt || '').slice(0, 200),
        sort_order: parseInt(g.sort_order, 10) || 0,
        published: !!g.published,
      };
      const { data, error } = await supabase.from('gallery').update(row).eq('id', g.id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id, storage_path } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      if (error) throw error;
      // Safe deletion of the underlying file when it lives in our media bucket.
      if (storage_path) {
        await supabase.storage.from('media').remove([storage_path]).catch(() => {});
      }
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('gallery API error:', err);
    res.status(500).json({ error: err.message });
  }
}
