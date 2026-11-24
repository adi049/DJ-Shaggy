import supabase from './db-client.js';
import { setCors, verifyAdmin, newOrderId, brandEmail, sendEmail, getSetting, rateLimit, rateLimitDb, originGuard, logApi, esc, audit } from './_utils.js';

const PUBLIC_ORDER_COLS = 'id,customer_name,email,items,subtotal,discount_code,discount_amount,amount,payment_status,delivery_status,created_at,delivered_at';

async function logEvent(orderId, event, note = '', actor = 'system') {
  try {
    await supabase.from('order_events').insert({ order_id: orderId, event, note: String(note).slice(0, 500), actor });
  } catch { /* logging must never break the order flow */ }
}

async function priceItems(items) {
  // Never trust client prices: re-price every item from the database.
  const productIds = items.filter((i) => i.type === 'product').map((i) => i.id);
  const bundleIds = items.filter((i) => i.type === 'bundle').map((i) => i.id);
  const priced = [];
  if (productIds.length) {
    const { data } = await supabase.from('products').select('id,name,price,artwork_url,status').in('id', productIds);
    for (const p of data || []) {
      if (p.status === 'published') priced.push({ type: 'product', id: p.id, name: p.name, price: p.price, artwork_url: p.artwork_url });
    }
  }
  if (bundleIds.length) {
    const { data } = await supabase.from('bundles').select('id,name,price,artwork_url,status').in('id', bundleIds);
    for (const b of data || []) {
      if (b.status === 'published') priced.push({ type: 'bundle', id: b.id, name: b.name, price: b.price, artwork_url: b.artwork_url });
    }
  }
  return priced;
}

async function resolveDeliveryLinks(order) {
  // Build the delivery payload for ONLY the purchased products.
  const productIds = new Set();
  for (const item of order.items) {
    if (item.type === 'product') productIds.add(item.id);
    if (item.type === 'bundle') {
      const { data: b } = await supabase.from('bundles').select('product_ids').eq('id', item.id).maybeSingle();
      (b?.product_ids || []).forEach((id) => productIds.add(id));
    }
  }
  if (!productIds.size) return [];
  const { data: products } = await supabase
    .from('products')
    .select('id,name,delivery_link,drive_folder_url')
    .in('id', [...productIds]);
  return (products || []).map((p) => ({
    name: p.name,
    link: p.delivery_link || p.drive_folder_url || '',
  }));
}

function statusLabel(o) {
  if (o.delivery_status === 'delivered') return 'Delivered';
  if (o.payment_status === 'verified' && o.delivery_status !== 'delivered') return 'Verified — delivery pending';
  return { pending_verification: 'Pending Verification', verified: 'Verified', rejected: 'Rejected', on_hold: 'On Hold' }[o.payment_status] || o.payment_status;
}

async function mailOrderConfirmed(order, payment) {
  const items = order.items.map((i) => `<li style="margin:4px 0;">${esc(i.name)} — ₹${i.price}</li>`).join('');
  const html = brandEmail(`Order ${esc(order.id)} received`, `
    <p>Hi ${esc(order.customer_name)},</p>
    <p>Thanks for your order! We have received your purchase details.</p>
    <ul style="padding-left:18px;">${items}</ul>
    <p style="margin-top:14px;"><strong style="color:#d8b45a;">Total: ₹${order.amount}</strong></p>
    <p><strong>Next step:</strong> complete the UPI payment of exactly ₹${order.amount} to
    <strong style="color:#d8b45a;">${esc(payment?.upi_id || 'the UPI ID shown at checkout')}</strong> and submit your UTR / transaction reference on the order page if you have not already.</p>
    <p>Your order status is <strong>Pending Verification</strong>. Once our team manually verifies the payment in our bank/UPI app, your playlists will be delivered to this email address.</p>`);
  return sendEmail({ to: order.email, subject: `Order ${order.id} received — DJ SHAGGY`, html });
}

async function mailPaymentReceived(order) {
  const html = brandEmail(`Payment reference received — ${esc(order.id)}`, `
    <p>Hi ${esc(order.customer_name)},</p>
    <p>We've received your payment reference (UTR) for order <strong>${esc(order.id)}</strong> (₹${order.amount}).</p>
    <p>Our team now manually verifies the transaction in our bank/UPI app. Once verified, your playlist download links will be emailed to you. Nothing else is needed from you right now.</p>`);
  return sendEmail({ to: order.email, subject: `Payment received, verification in progress (${order.id}) — DJ SHAGGY`, html });
}

async function mailDelivered(order, links) {
  const rows = links.map((l) => l.link
    ? `<tr><td style="padding:8px 0;color:#f5f2ea;">${esc(l.name)}</td><td style="padding:8px 0;"><a href="${esc(l.link)}" style="color:#0a0a0b;background:#d8b45a;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:12px;">OPEN PLAYLIST</a></td></tr>`
    : `<tr><td style="padding:8px 0;color:#f5f2ea;">${esc(l.name)}</td><td style="padding:8px 0;color:#9a9aa3;font-size:12px;">Link will be shared shortly</td></tr>`).join('');
  const html = brandEmail(`Your playlists are ready — ${esc(order.id)}`, `
    <p>Hi ${esc(order.customer_name)},</p>
    <p>Your payment has been <strong style="color:#2fd27d;">verified</strong>. Here are your purchased playlists, delivered via Google Drive:</p>
    <table style="width:100%;margin-top:10px;">${rows}</table>
    <p style="margin-top:16px;font-size:12px;color:#9a9aa3;">Tip: add the folders to your own Drive or download the tracks. Links are for your personal use only — please do not redistribute.</p>`);
  return sendEmail({ to: order.email, subject: `Your DJ SHAGGY playlists are ready (${order.id})`, html });
}

async function mailRejected(order, note) {
  const html = brandEmail(`Order ${esc(order.id)} — payment could not be verified`, `
    <p>Hi ${esc(order.customer_name)},</p>
    <p>We could not verify the payment for order <strong>${esc(order.id)}</strong> (₹${order.amount}).</p>
    ${note ? `<p>Reason: ${esc(note)}</p>` : ''}
    <p>If you believe this is a mistake, reply to this email or contact support with your Order ID and payment proof. If no payment was made, you can simply place a new order.</p>`);
  return sendEmail({ to: order.email, subject: `Order ${order.id} could not be verified — DJ SHAGGY`, html });
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    /* ---------------- CREATE ORDER (public) ---------------- */
    if (req.method === 'POST') {
      const og = originGuard(req);
      if (!og.ok) return res.status(403).json({ error: og.error });
      const rl = rateLimit(req, { key: 'order-create', limit: 10, windowMs: 60000 });
      if (rl.limited) return res.status(429).json({ error: `Too many attempts — please retry in ${rl.retryAfter}s` });
      const rlDb = await rateLimitDb(req, { key: 'order-create', limit: 20, windowMs: 10 * 60000 });
      if (rlDb.limited) return res.status(429).json({ error: `Too many orders — please retry in ${rlDb.retryAfter}s` });
      const { customer_name, email, phone, items, discount_code } = req.body || {};
      if (!customer_name || !email || !phone) return res.status(400).json({ error: 'Name, email and phone are required' });
      if (!/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
      if (!/^[+]?[0-9\s-]{8,15}$/.test(phone)) return res.status(400).json({ error: 'Invalid phone number' });
      if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty' });

      const priced = await priceItems(items.slice(0, 50));
      if (!priced.length) return res.status(400).json({ error: 'No valid items in cart' });
      const subtotal = priced.reduce((s, i) => s + i.price, 0);

      let discountAmount = 0;
      let appliedCode = null;
      let appliedCoupon = null;
      if (discount_code) {
        const code = String(discount_code).toUpperCase().trim();
        const { data: d } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
        if (d && d.active
          && (!d.expires_at || new Date(d.expires_at).getTime() > Date.now())
          && (!d.usage_limit || (d.used_count || 0) < d.usage_limit)
          && subtotal >= (d.min_amount || 0)) {
          discountAmount = d.kind === 'percent' ? Math.round((subtotal * d.value) / 100) : Math.min(d.value, subtotal);
          if (d.kind === 'percent' && d.max_discount) discountAmount = Math.min(discountAmount, d.max_discount);
          discountAmount = Math.min(discountAmount, subtotal);
          appliedCode = code;
          appliedCoupon = d;
        }
      }
      const amount = Math.max(0, subtotal - discountAmount);

      // Idempotency: an identical cart by the same email in the last 5 minutes
      // returns the existing order instead of creating a duplicate.
      const itemKey = priced.map((i) => `${i.type}:${i.id}`).sort().join('|');
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from('orders').select('id,items,amount,created_at')
        .eq('email', String(email).toLowerCase())
        .eq('payment_status', 'pending_verification')
        .gte('created_at', since)
        .order('created_at', { ascending: false }).limit(5);
      const dupe = (recent || []).find((o) =>
        (o.items || []).map((i) => `${i.type}:${i.id}`).sort().join('|') === itemKey && Number(o.amount) === amount);
      if (dupe) {
        return res.status(200).json({ id: dupe.id, amount: dupe.amount, existing: true });
      }

      // Atomic coupon usage: conditional update only succeeds while under the limit.
      if (appliedCoupon) {
        if (appliedCoupon.usage_limit) {
          const { data: upd } = await supabase.from('coupons')
            .update({ used_count: (appliedCoupon.used_count || 0) + 1 })
            .eq('id', appliedCoupon.id)
            .lt('used_count', appliedCoupon.usage_limit)
            .select('id');
          if (!upd?.length) {
            // Coupon raced to its limit between validation and order — proceed without it.
            discountAmount = 0; appliedCode = null; appliedCoupon = null;
          }
        } else {
          await supabase.from('coupons').update({ used_count: (appliedCoupon.used_count || 0) + 1 }).eq('id', appliedCoupon.id);
        }
      }

      const finalAmount = Math.max(0, subtotal - discountAmount);
      let id = newOrderId();
      for (let i = 0; i < 4; i++) {
        const { data: clash } = await supabase.from('orders').select('id').eq('id', id).maybeSingle();
        if (!clash) break;
        id = newOrderId();
      }

      const row = {
        id,
        customer_name: String(customer_name).slice(0, 120),
        email: String(email).toLowerCase().slice(0, 160),
        phone: String(phone).slice(0, 20),
        items: priced,
        subtotal,
        discount_code: appliedCode,
        discount_amount: discountAmount,
        amount: finalAmount,
        payment_status: 'pending_verification',
        delivery_status: 'pending',
      };
      const { data: order, error } = await supabase.from('orders').insert(row).select().single();
      if (error) throw error;

      await logEvent(id, 'created', `Order placed for ₹${finalAmount}`, 'customer');
      logApi('orders', req, 201, `order ${id} created (${priced.length} items)`);

      const payment = await getSetting('payment');
      const mail = await mailOrderConfirmed(order, payment);
      if (mail.sent) await supabase.from('orders').update({ confirmation_email_sent: true }).eq('id', id);

      return res.status(201).json({ id: order.id, amount: order.amount, email_sent: mail.sent, email_note: mail.reason || null });
    }

    /* ---------------- READ ---------------- */
    if (req.method === 'GET') {
      // Public single-order tracking: requires order id + email.
      if (req.query.id && req.query.email) {
        const rl = rateLimit(req, { key: 'order-track', limit: 20, windowMs: 60000 });
        if (rl.limited) return res.status(429).json({ error: `Too many lookups — retry in ${rl.retryAfter}s` });
        const id = String(req.query.id).toUpperCase().trim();
        const email = String(req.query.email).toLowerCase().trim();
        const { data: order } = await supabase.from('orders').select(PUBLIC_ORDER_COLS).eq('id', id).eq('email', email).maybeSingle();
        if (!order) return res.status(404).json({ error: 'Order not found. Check your Order ID and email.' });
        // Delivery links are only included once the order is delivered.
        if (order.delivery_status !== 'delivered') {
          order.items = order.items.map(({ link, ...rest }) => rest);
        }
        return res.status(200).json({ ...order, status_label: statusLabel(order) });
      }
      // Admin list.
      const a = await verifyAdmin(req);
      if (!a.ok) { logApi('orders', req, a.status); return res.status(a.status).json({ error: a.error }); }
      let q = supabase.from('orders').select('*, order_events(*)').order('created_at', { ascending: false }).limit(500);
      if (req.query.status && req.query.status !== 'all') q = q.eq('payment_status', req.query.status);
      if (req.query.search) {
        const s = String(req.query.search).replace(/["%_]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
        if (s) q = q.or(`id.ilike."%${s}%",email.ilike."%${s}%",customer_name.ilike."%${s}%",phone.ilike."%${s}%",utr.ilike."%${s}%"`);
      }
      const { data, error } = await q;
      if (error) throw error;
      // Signed URLs for payment screenshots (private bucket).
      const paths = (data || []).map((o) => o.payment_screenshot_path).filter(Boolean);
      let urlMap = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage.from('payments').createSignedUrls(paths, 600);
        (signed || []).forEach((s, i) => { if (s?.signedUrl) urlMap[paths[i]] = s.signedUrl; });
      }
      const orders = (data || []).map((o) => ({ ...o, screenshot_url: o.payment_screenshot_path ? urlMap[o.payment_screenshot_path] || null : null, status_label: statusLabel(o) }));
      return res.status(200).json(orders);
    }

    /* ---------------- UPDATE ---------------- */
    if (req.method === 'PUT') {
      const body = req.body || {};
      const { id, action } = body;
      if (!id || !action) return res.status(400).json({ error: 'id and action are required' });

      // Customer submits payment reference (UTR + screenshot).
      if (action === 'submit_payment') {
        const og = originGuard(req);
        if (!og.ok) return res.status(403).json({ error: og.error });
        const rl = rateLimit(req, { key: 'submit-payment', limit: 10, windowMs: 60000 });
        if (rl.limited) return res.status(429).json({ error: `Too many attempts — please retry in ${rl.retryAfter}s` });
        const rlDb = await rateLimitDb(req, { key: 'submit-payment', limit: 30, windowMs: 10 * 60000 });
        if (rlDb.limited) return res.status(429).json({ error: `Too many attempts — please retry in ${rlDb.retryAfter}s` });
        const email = String(body.email || '').toLowerCase().trim();
        const utr = String(body.utr || '').trim();
        if (!email) return res.status(400).json({ error: 'Email is required' });
        if (utr && utr.length < 6) return res.status(400).json({ error: 'If provided, the UTR / transaction reference must be at least 6 characters' });
        if (!utr && !body.screenshot_path) return res.status(400).json({ error: 'Provide a UTR or a payment screenshot so we can verify your payment' });
        const { data: order } = await supabase.from('orders').select('*').eq('id', id).eq('email', email).maybeSingle();
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.payment_status !== 'pending_verification') return res.status(400).json({ error: 'Payment details were already processed for this order' });
        const { error } = await supabase.from('orders').update({
          utr: utr.slice(0, 60),
          payment_screenshot_path: body.screenshot_path || order.payment_screenshot_path,
        }).eq('id', id);
        if (error) throw error;
        await logEvent(id, 'payment_submitted', utr ? `UTR ${utr.slice(0, 60)} submitted` : 'Payment screenshot submitted (no UTR)', 'customer');
        await mailPaymentReceived(order); // best-effort; result visible in Resend logs
        return res.status(200).json({ ok: true, message: 'Payment reference submitted. We will verify it manually and deliver your playlists.' });
      }

      // Everything below is admin-only.
      const a = await verifyAdmin(req);
      if (!a.ok) { logApi('orders', req, a.status); return res.status(a.status).json({ error: a.error }); }

      const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      const actor = a.user.email || 'admin';

      if (action === 'approve') {
        if (order.payment_status === 'verified') return res.status(400).json({ error: 'Order already verified' });
        const links = await resolveDeliveryLinks(order);
        const items = order.items.map((it) => {
          if (it.type === 'product') {
            const l = links.find((x) => x.name === it.name);
            return { ...it, link: l?.link || '' };
          }
          return it;
        });
        const mail = await mailDelivered(order, links);
        // Never mark delivery successful when the delivery email failed.
        const delivered = mail.sent;
        const { data, error } = await supabase.from('orders').update({
          payment_status: 'verified',
          delivery_status: delivered ? 'delivered' : 'pending',
          delivered_at: delivered ? new Date().toISOString() : null,
          items,
          admin_note: body.note || order.admin_note,
          delivery_email_sent: mail.sent,
          delivery_email_note: mail.sent ? null : (mail.reason || 'Email not sent'),
        }).eq('id', id).select().single();
        if (error) throw error;
        await logEvent(id, delivered ? 'approved_delivered' : 'delivery_email_failed',
          mail.sent ? 'Payment verified, delivery email sent' : `Payment verified but delivery email failed (${mail.reason || 'not configured'})`, 'admin');
        await audit(actor, 'order.approve', `${id} → ${delivered ? 'delivered' : 'email failed, delivery pending'}`);
        return res.status(200).json({ ...data, status_label: statusLabel(data), email_sent: mail.sent, email_note: mail.reason || null });
      }

      if (action === 'resend_delivery') {
        if (order.payment_status !== 'verified') return res.status(400).json({ error: 'Only verified orders can be (re)sent' });
        if (order.delivery_status === 'delivered' && !body.force) {
          // Re-sending a delivered order is allowed but logged distinctly.
        }
        const links = await resolveDeliveryLinks(order);
        const mail = await mailDelivered(order, links);
        const update = {
          delivery_email_sent: mail.sent,
          delivery_email_note: mail.sent ? null : (mail.reason || 'Email not sent'),
        };
        if (mail.sent && order.delivery_status !== 'delivered') {
          update.delivery_status = 'delivered';
          update.delivered_at = new Date().toISOString();
        }
        const { data, error } = await supabase.from('orders').update(update).eq('id', id).select().single();
        if (error) throw error;
        await logEvent(id, 'delivery_resent', mail.sent ? 'Delivery email sent' : `Send failed (${mail.reason || 'not configured'})`, 'admin');
        await audit(actor, 'order.resend_delivery', `${id} → ${mail.sent ? 'sent' : 'failed'}`);
        return res.status(200).json({ ...data, status_label: statusLabel(data), email_sent: mail.sent, email_note: mail.reason || null });
      }

      if (action === 'mark_delivered') {
        // Manual confirmation that links were shared outside email (e.g. WhatsApp).
        if (order.payment_status !== 'verified') return res.status(400).json({ error: 'Verify payment first' });
        const { data, error } = await supabase.from('orders').update({
          delivery_status: 'delivered', delivered_at: new Date().toISOString(),
          admin_note: body.note || order.admin_note,
        }).eq('id', id).select().single();
        if (error) throw error;
        await logEvent(id, 'marked_delivered', body.note || 'Marked delivered manually by admin', 'admin');
        await audit(actor, 'order.mark_delivered', id);
        return res.status(200).json({ ...data, status_label: statusLabel(data) });
      }

      if (action === 'refund') {
        if (order.payment_status !== 'verified') return res.status(400).json({ error: 'Only verified (paid) orders can be marked refunded' });
        await logEvent(id, 'refunded', body.note || 'Refund issued (manual, outside the app)', 'admin');
        await audit(actor, 'order.refund', `${id} ₹${order.amount}`);
        return res.status(200).json({ ok: true, note: 'Refund recorded in order history' });
      }

      if (action === 'reject') {
        const mail = await mailRejected(order, body.note);
        const { data, error } = await supabase.from('orders').update({
          payment_status: 'rejected', admin_note: body.note || order.admin_note,
        }).eq('id', id).select().single();
        if (error) throw error;
        await logEvent(id, 'rejected', body.note || 'Payment rejected', 'admin');
        await audit(actor, 'order.reject', id);
        return res.status(200).json({ ...data, status_label: statusLabel(data), email_sent: mail.sent, email_note: mail.reason || null });
      }

      if (action === 'hold') {
        const { data, error } = await supabase.from('orders').update({
          payment_status: 'on_hold', admin_note: body.note || order.admin_note,
        }).eq('id', id).select().single();
        if (error) throw error;
        await logEvent(id, 'on_hold', body.note || 'Order placed on hold', 'admin');
        await audit(actor, 'order.hold', id);
        return res.status(200).json({ ...data, status_label: statusLabel(data) });
      }

      if (action === 'note') {
        const { data, error } = await supabase.from('orders').update({ admin_note: body.note || '' }).eq('id', id).select().single();
        if (error) throw error;
        await logEvent(id, 'note', body.note || '', 'admin');
        return res.status(200).json({ ...data, status_label: statusLabel(data) });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    logApi('orders', req, 500, err.message);
    res.status(500).json({ error: 'Something went wrong processing the order' });
  }
}
