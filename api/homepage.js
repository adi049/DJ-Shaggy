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
      let sq = supabase.from('home_sections').select('*').order('sort_order', { ascending: true });
      let bq = supabase.from('banners').select('*').order('sort_order', { ascending: true });
      if (!all) { sq = sq.eq('visible', true); bq = bq.eq('active', true); }
      const [{ data: sections, error: e1 }, { data: banners, error: e2 }] = await Promise.all([sq, bq]);
      if (e1) throw e1;
      if (e2) throw e2;
      return res.status(200).json({ sections: sections || [], banners: banners || [] });
    }

    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    if (req.method === 'PUT') {
      const { type, ...row } = req.body || {};
      if (type === 'section') {
        if (!row.id) return res.status(400).json({ error: 'id is required' });
        const upd = {
          title: String(row.title ?? '').slice(0, 160),
          subtitle: String(row.subtitle ?? '').slice(0, 500),
          visible: !!row.visible,
          sort_order: parseInt(row.sort_order, 10) || 0,
          config: row.config && typeof row.config === 'object' ? row.config : {},
        };
        const { data, error } = await supabase.from('home_sections').update(upd).eq('id', row.id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (type === 'banner') {
        if (!row.id) return res.status(400).json({ error: 'id is required' });
        const upd = bannerRow(row);
        const { data, error } = await supabase.from('banners').update(upd).eq('id', row.id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      return res.status(400).json({ error: 'type must be section or banner' });
    }

    if (req.method === 'POST') {
      const { type, ...row } = req.body || {};
      if (type !== 'banner') return res.status(400).json({ error: 'Only banners can be created' });
      const { data, error } = await supabase.from('banners').insert(bannerRow(row)).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { type, id } = req.body || {};
      if (type !== 'banner' || !id) return res.status(400).json({ error: 'type=banner and id are required' });
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('homepage API error:', err);
    res.status(500).json({ error: err.message });
  }
}

function bannerRow(r) {
  return {
    title: String(r.title || '').slice(0, 160),
    subtitle: String(r.subtitle || '').slice(0, 200),
    image_url: String(r.image_url || ''),
    cta_label: String(r.cta_label || '').slice(0, 60),
    cta_link: String(r.cta_link || '').slice(0, 200),
    active: r.active !== false,
    sort_order: parseInt(r.sort_order, 10) || 0,
  };
}
