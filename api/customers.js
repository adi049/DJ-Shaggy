import supabase from './db-client.js';
import { setCors, verifyAdmin } from './_utils.js';

// Customers are derived from real orders \u2014 no separate mock list.
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id,email,customer_name,phone,amount,payment_status,delivery_status,items,created_at')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;

    const map = new Map();
    for (const o of orders || []) {
      const key = o.email;
      if (!map.has(key)) {
        map.set(key, {
          email: o.email,
          name: o.customer_name,
          phone: o.phone,
          order_count: 0,
          total_spent: 0,
          last_order_at: o.created_at,
          orders: [],
        });
      }
      const c = map.get(key);
      c.order_count += 1;
      if (o.payment_status === 'verified') c.total_spent += Number(o.amount) || 0;
      c.orders.push({
        id: o.id,
        amount: o.amount,
        payment_status: o.payment_status,
        delivery_status: o.delivery_status,
        created_at: o.created_at,
        items: (o.items || []).map((i) => ({ name: i.name, price: i.price, type: i.type })),
      });
    }

    const customers = [...map.values()].sort((x, y) => new Date(y.last_order_at) - new Date(x.last_order_at));
    return res.status(200).json(customers);
  } catch (err) {
    console.error('customers API error:', err);
    res.status(500).json({ error: err.message });
  }
}
