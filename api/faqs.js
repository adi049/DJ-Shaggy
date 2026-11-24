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
      let q = supabase.from('faqs').select('*').order('sort_order', { ascending: true });
      if (!all) q = q.eq('published', true);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    if (req.method === 'POST') {
      const f = req.body || {};
      if (!f.question || !f.answer) return res.status(400).json({ error: 'Question and answer are required' });
      const row = { question: f.question, answer: f.answer, category: f.category || 'General', sort_order: parseInt(f.sort_order, 10) || 0, published: f.published !== false };
      const { data, error } = await supabase.from('faqs').insert(row).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const f = req.body || {};
      if (!f.id) return res.status(400).json({ error: 'id is required' });
      const row = { question: f.question, answer: f.answer, category: f.category || 'General', sort_order: parseInt(f.sort_order, 10) || 0, published: !!f.published };
      const { data, error } = await supabase.from('faqs').update(row).eq('id', f.id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('faqs API error:', err);
    res.status(500).json({ error: err.message });
  }
}
