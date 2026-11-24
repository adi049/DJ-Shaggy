import supabase from './db-client.js';
import { setCors, verifyAdmin, slugify, rateLimit, audit } from './_utils.js';

const PUBLIC_COLS = 'id,title,slug,excerpt,image_url,author,created_at,seo_title,seo_desc';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const all = req.query.all === '1';
      if (all) {
        const a = await verifyAdmin(req);
        if (!a.ok) return res.status(a.status).json({ error: a.error });
        const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data || []);
      }
      const rl = rateLimit(req, { key: 'posts', limit: 60, windowMs: 60000 });
      if (rl.limited) return res.status(429).json({ error: 'Too many requests' });
      let q = supabase.from('posts').select(req.query.slug ? `${PUBLIC_COLS},content` : PUBLIC_COLS)
        .eq('status', 'published').order('created_at', { ascending: false });
      if (req.query.slug) q = q.eq('slug', req.query.slug);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(req.query.slug ? data?.[0] || null : data || []);
    }

    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    if (req.method === 'POST') {
      const p = req.body || {};
      if (!p.title) return res.status(400).json({ error: 'Title is required' });
      let slug = p.slug ? slugify(p.slug) : slugify(p.title);
      const { data: clash } = await supabase.from('posts').select('id').eq('slug', slug).maybeSingle();
      if (clash) slug = `${slug}-${Date.now().toString(36)}`;
      const { data, error } = await supabase.from('posts').insert(postRow(p, slug)).select().single();
      if (error) throw error;
      await audit(a.user.email, 'post.create', data.title);
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const p = req.body || {};
      if (!p.id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('posts').update(postRow(p, p.slug ? slugify(p.slug) : undefined)).eq('id', p.id).select().single();
      if (error) throw error;
      await audit(a.user.email, 'post.update', `#${p.id} ${p.title || ''}`);
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      await audit(a.user.email, 'post.delete', `#${id}`);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: 'Post operation failed' });
  }
}

function postRow(p, slug) {
  const row = {
    title: String(p.title || '').slice(0, 200),
    excerpt: String(p.excerpt || '').slice(0, 300),
    content: String(p.content || ''),
    image_url: String(p.image_url || ''),
    seo_title: String(p.seo_title || '').slice(0, 200),
    seo_desc: String(p.seo_desc || '').slice(0, 300),
    status: p.status === 'published' ? 'published' : 'draft',
  };
  if (slug) row.slug = slug;
  return row;
}
