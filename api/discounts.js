import supabase from './db-client.js';
import { setCors, verifyAdmin, rateLimit, audit } from './_utils.js';

function computeDiscount(d, amount) {
  let discount = d.kind === 'percent' ? Math.round((amount * d.value) / 100) : Math.min(d.value, amount);
  if (d.kind === 'percent' && d.max_discount) discount = Math.min(discount, d.max_discount);
  return Math.max(0, Math.min(discount, amount));
}

export function validateCoupon(d, amount) {
  if (!d || !d.active) return { valid: false, reason: 'Invalid or expired code' };
  if (d.expires_at && new Date(d.expires_at).getTime() < Date.now()) return { valid: false, reason: 'This code has expired' };
  if (d.usage_limit && (d.used_count || 0) >= d.usage_limit) return { valid: false, reason: 'This code has reached its usage limit' };
  if (d.min_amount && amount < d.min_amount) return { valid: false, reason: `Minimum order ₹${d.min_amount} required for ${d.code}` };
  return { valid: true, discount: computeDiscount(d, amount) };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      // Public: validate a single code. Admin: list all.
      if (req.query.code) {
        const rl = rateLimit(req, { key: 'coupon', limit: 30, windowMs: 60000 });
        if (rl.limited) return res.status(429).json({ valid: false, reason: `Too many attempts — retry in ${rl.retryAfter}s` });
        const code = String(req.query.code).toUpperCase().trim();
        const amount = Number(req.query.amount) || 0;
        const { data: d } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
        const v = validateCoupon(d, amount);
        if (!v.valid) return res.status(200).json({ valid: false, reason: v.reason });
        return res.status(200).json({ valid: true, code: d.code, kind: d.kind, value: d.value, max_discount: d.max_discount, discount: v.discount });
      }
      const a = await verifyAdmin(req);
      if (!a.ok) return res.status(a.status).json({ error: a.error });
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    if (req.method === 'POST') {
      const d = req.body || {};
      if (!d.code) return res.status(400).json({ error: 'Code is required' });
      const { data: clash } = await supabase.from('coupons').select('id').eq('code', String(d.code).toUpperCase().trim()).maybeSingle();
      if (clash) return res.status(400).json({ error: 'That code already exists' });
      const { data, error } = await supabase.from('coupons').insert(couponRow(d)).select().single();
      if (error) throw error;
      await audit(a.user.email, 'coupon.create', data.code);
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const d = req.body || {};
      if (!d.id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('coupons').update(couponRow(d)).eq('id', d.id).select().single();
      if (error) throw error;
      await audit(a.user.email, 'coupon.update', couponRow(d).code);
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      await audit(a.user.email, 'coupon.delete', `#${id}`);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('coupons API error:', err);
    res.status(500).json({ error: err.message });
  }
}

function couponRow(d) {
  return {
    code: String(d.code || '').toUpperCase().trim().slice(0, 40),
    kind: d.kind === 'flat' ? 'flat' : 'percent',
    value: Math.max(0, Number(d.value) || 0),
    min_amount: Math.max(0, Number(d.min_amount) || 0),
    max_discount: d.max_discount ? Math.max(0, Number(d.max_discount)) : null,
    usage_limit: d.usage_limit ? Math.max(1, parseInt(d.usage_limit, 10)) : null,
    expires_at: d.expires_at || null,
    active: d.active !== false,
  };
}
