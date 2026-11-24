import supabase from './db-client.js';
import { setCors, verifyAdmin, audit } from './_utils.js';

// Keys safe to expose publicly (no admin data, no secrets).
const PUBLIC_KEYS = ['payment', 'whatsapp', 'site', 'seo', 'delivery'];

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      if (req.query.all === '1') {
        const a = await verifyAdmin(req);
        if (!a.ok) return res.status(a.status).json({ error: a.error });
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;
        const out = {};
        (data || []).forEach((r) => { out[r.key] = r.value; });
        return res.status(200).json(out);
      }
      const { data, error } = await supabase.from('settings').select('*').in('key', PUBLIC_KEYS);
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => { out[r.key] = r.value; });
      // Never leak anything sensitive in the public payload.
      if (out.payment) out.payment = { upi_id: out.payment.upi_id, payee_name: out.payment.payee_name, qr_url: out.payment.qr_url, instructions: out.payment.instructions };
      return res.status(200).json(out);
    }

    if (req.method === 'PUT') {
      const a = await verifyAdmin(req);
      if (!a.ok) return res.status(a.status).json({ error: a.error });
      const { key, value } = req.body || {};
      if (!key || typeof key !== 'string' || !/^[a-z_]+$/.test(key)) return res.status(400).json({ error: 'Invalid settings key' });
      if (value === undefined) return res.status(400).json({ error: 'value is required' });
      const { data, error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' }).select().single();
      if (error) throw error;
      await audit(a.user.email, 'settings.update', key);
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('settings API error:', err);
    res.status(500).json({ error: err.message });
  }
}
