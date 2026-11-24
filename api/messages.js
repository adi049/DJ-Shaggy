import supabase from './db-client.js';
import { setCors, verifyAdmin, rateLimit, originGuard } from './_utils.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const og = originGuard(req);
      if (!og.ok) return res.status(403).json({ error: og.error });
      const rl = rateLimit(req, { key: 'messages', limit: 6, windowMs: 60000 });
      if (rl.limited) return res.status(429).json({ error: `Too many messages — please retry in ${rl.retryAfter}s` });
      const { name, email, subject, message } = req.body || {};
      if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required' });
      if (!/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
      const { data, error } = await supabase.from('messages').insert({
        name: String(name).slice(0, 120),
        email: String(email).slice(0, 160),
        subject: String(subject || 'General enquiry').slice(0, 160),
        message: String(message).slice(0, 4000),
      }).select('id').single();
      if (error) throw error;
      return res.status(201).json({ ok: true, id: data.id });
    }

    if (req.method === 'GET') {
      const a = await verifyAdmin(req);
      if (!a.ok) return res.status(a.status).json({ error: a.error });
      const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'PUT') {
      const a = await verifyAdmin(req);
      if (!a.ok) return res.status(a.status).json({ error: a.error });
      const { id, resolved } = req.body || {};
      const { data, error } = await supabase.from('messages').update({ resolved: !!resolved }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const a = await verifyAdmin(req);
      if (!a.ok) return res.status(a.status).json({ error: a.error });
      const { id } = req.body || {};
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('messages API error:', err);
    res.status(500).json({ error: err.message });
  }
}
