import supabase from './db-client.js';
import { setCors, rateLimit } from './_utils.js';

const SAFE_COLS = 'id,items,subtotal,discount_code,discount_amount,amount,payment_status,delivery_status,created_at,delivered_at';

// Customer's own order history. Identity comes from the verified session token
// (the email on the auth user) — never from client-supplied input.
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rl = rateLimit(req, { key: 'my-orders', limit: 30, windowMs: 60000 });
    if (rl.limited) return res.status(429).json({ error: `Too many requests — retry in ${rl.retryAfter}s` });

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Sign in to view your orders' });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.email) return res.status(401).json({ error: 'Invalid or expired session' });

    const { data, error: qErr } = await supabase
      .from('orders')
      .select(SAFE_COLS)
      .eq('email', user.email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(100);
    if (qErr) throw qErr;

    const orders = (data || []).map((o) => ({
      ...o,
      items: o.delivery_status === 'delivered'
        ? o.items
        : (o.items || []).map(({ link, ...rest }) => rest),
    }));
    return res.status(200).json({ email: user.email, name: user.user_metadata?.full_name || '', orders });
  } catch (err) {
    res.status(500).json({ error: 'Could not load orders' });
  }
}
