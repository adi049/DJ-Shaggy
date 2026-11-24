import supabase from './db-client.js';
import { setCors, verifyAdmin } from './_utils.js';

// Real-data analytics from orders only. No invented metrics.
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const from = new Date(Date.now() - days * 86400000).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id,amount,items,payment_status,delivery_status,created_at,email')
      .gte('created_at', from)
      .order('created_at', { ascending: true })
      .limit(2000);
    if (error) throw error;

    const all = orders || [];
    const verified = all.filter((o) => o.payment_status === 'verified');

    const byStatus = {};
    all.forEach((o) => { byStatus[o.payment_status] = (byStatus[o.payment_status] || 0) + 1; });

    const byDay = {};
    verified.forEach((o) => {
      const d = o.created_at.slice(0, 10);
      byDay[d] = (byDay[d] || 0) + (Number(o.amount) || 0);
    });

    const productUnits = {};
    const productRevenue = {};
    verified.forEach((o) => {
      (o.items || []).forEach((i) => {
        productUnits[i.name] = (productUnits[i.name] || 0) + 1;
        productRevenue[i.name] = (productRevenue[i.name] || 0) + (Number(i.price) || 0);
      });
    });
    const topProducts = Object.entries(productUnits)
      .map(([name, units]) => ({ name, units, revenue: productRevenue[name] }))
      .sort((x, y) => y.units - x.units)
      .slice(0, 8);

    return res.status(200).json({
      days,
      orders_total: all.length,
      orders_by_status: byStatus,
      delivered: all.filter((o) => o.delivery_status === 'delivered').length,
      revenue_verified: verified.reduce((s, o) => s + (Number(o.amount) || 0), 0),
      avg_order_value: verified.length ? Math.round(verified.reduce((s, o) => s + Number(o.amount), 0) / verified.length) : 0,
      unique_customers: new Set(all.map((o) => o.email)).size,
      revenue_by_day: Object.entries(byDay).map(([date, total]) => ({ date, total })),
      top_products: topProducts,
    });
  } catch (err) {
    res.status(500).json({ error: 'Analytics failed' });
  }
}
