import supabase from './db-client.js';
import { setCors, verifyAdmin } from './_utils.js';

// Central admin audit trail (read-only API).
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Could not load audit log' });
  }
}
