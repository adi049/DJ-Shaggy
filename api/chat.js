import supabase from './db-client.js';
import { setCors, PUBLIC_PRODUCT_COLS, getSetting, rateLimit, logApi } from './_utils.js';

async function loadContext() {
  const [{ data: products }, { data: genres }, { data: faqs }, { data: bundles }, payment, whatsapp, site] = await Promise.all([
    supabase.from('products').select(PUBLIC_PRODUCT_COLS).eq('status', 'published'),
    supabase.from('genres').select('id,name,slug,description').eq('published', true),
    supabase.from('faqs').select('question,answer,category').eq('published', true),
    supabase.from('bundles').select('name,slug,description,price,original_price,product_ids').eq('status', 'published'),
    getSetting('payment'), getSetting('whatsapp'), getSetting('site'),
  ]);
  return { products: products || [], genres: genres || [], faqs: faqs || [], bundles: bundles || [], payment, whatsapp, site };
}

const compact = (p) => ({
  slug: p.slug, name: p.name, price: p.price, original_price: p.original_price,
  track_count: p.track_count, artwork_url: p.artwork_url, genre: p.genres?.name || null,
  is_bestseller: p.is_bestseller,
});

function findProducts(ctx, { genreSlug, maxPrice, bestseller, query } = {}) {
  let list = ctx.products;
  if (genreSlug) list = list.filter((p) => p.genres?.slug === genreSlug);
  if (maxPrice) list = list.filter((p) => p.price <= maxPrice);
  if (bestseller) list = list.filter((p) => p.is_bestseller);
  if (query) {
    const q = query.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.tags || []).some((t) => t.includes(q)) || (p.description || '').toLowerCase().includes(q));
  }
  return list.slice(0, 4).map(compact);
}

// Rule-based assistant over the LIVE catalogue. Never invents products or prices.
function localReply(message, ctx) {
  const m = message.toLowerCase();
  const num = m.match(/(?:under|below|less than|within|budget of|rs\.?|inr|₹)\s*(\d{2,6})/) || m.match(/(\d{2,6})\s*(?:rs|inr|₹|rupees)/);
  const budget = num ? parseInt(num[1], 10) : null;

  const pick = (...arr) => arr[Math.floor(Math.random() * arr.length)];

  if (/^(hi|hii+|hello|hey|namaste|yo)\b/.test(m)) {
    return { reply: `Hey! I'm the DJ SHAGGY assistant. I can help you find playlists by genre or budget, explain payment & delivery, or answer FAQs. Try "best sellers", "Bollywood under ₹600" or "how does delivery work?"` };
  }
  if (/(best ?seller|top selling|most popular|trending)/.test(m)) {
    const prods = findProducts(ctx, { bestseller: true });
    return { reply: prods.length ? 'Here are our current best-selling playlists:' : 'No best sellers are marked right now — check the catalogue for everything available.', products: prods };
  }
  if (/(bundle|combo|pack deal|value pack)/.test(m)) {
    const bs = ctx.bundles.slice(0, 3).map((b) => ({ slug: b.slug, name: b.name, price: b.price, original_price: b.original_price, bundle: true, artwork_url: null, track_count: null }));
    if (!bs.length) return { reply: 'No bundles are live right now. Individual playlists are in the catalogue.' };
    return { reply: `We have ${ctx.bundles.length} value bundle(s). Bundles combine multiple playlists at a lower total price:`, products: bs };
  }
  const genre = ctx.genres.find((g) => m.includes(g.name.toLowerCase()) || m.includes(g.slug) || m.includes(g.name.toLowerCase().split(' ')[0]));
  if (genre) {
    const prods = findProducts(ctx, { genreSlug: genre.slug, maxPrice: budget || undefined });
    if (prods.length) return { reply: `${genre.name} playlists${budget ? ` under ₹${budget}` : ''}:`, products: prods };
    return { reply: `I couldn't find published ${genre.name} playlists${budget ? ` under ₹${budget}` : ''} right now. Browse the full catalogue or try another genre.` };
  }
  if (budget) {
    const prods = findProducts(ctx, { maxPrice: budget });
    return prods.length
      ? { reply: `Playlists under ₹${budget}:`, products: prods }
      : { reply: `Nothing published under ₹${budget} right now. The catalogue starts from our lowest-priced packs — take a look!` };
  }
  if (/(wedding|shaadi|baraat|sangeet)/.test(m)) {
    const prods = findProducts(ctx, { query: 'wedding' });
    return prods.length ? { reply: 'For weddings, these playlists are popular:', products: prods } : { reply: 'Check the Wedding Heat collection in the Collections page for wedding-ready packs.' };
  }
  if (/(how many tracks|track count|number of songs|songs in)/.test(m)) {
    const prods = findProducts(ctx, {});
    return { reply: 'Track counts are shown on every product card and page. A few examples:', products: prods };
  }
  if (/(pay|payment|upi|qr|bank transfer|price of everything|checkout)/.test(m)) {
    const upi = ctx.payment?.upi_id;
    return { reply: `We accept manual UPI / bank transfer at checkout.\n1. Add playlists to your cart and place the order.\n2. Pay the exact amount to UPI ID: ${upi || '(shown at checkout)'}.\n3. Submit your UTR / transaction reference and a payment screenshot.\n4. Our team manually verifies the payment in our bank/UPI app, then delivers your playlists by email.\nWe never auto-approve payments — verification is done by a human, usually quickly during working hours.` };
  }
  if (/(deliver|download|receive|get my|drive|access)/.test(m)) {
    return { reply: 'Delivery is digital via Google Drive. After your payment is manually verified by our team, you receive an email with Google Drive links for exactly the playlists you purchased. No physical shipping, and links are never shared before verification.' };
  }
  if (/(refund|cancel|money back)/.test(m)) {
    return { reply: 'Since these are digital products, delivered playlists cannot be refunded. If your payment cannot be verified or an order fails, you will not be charged / any verified issue is handled via support. See the FAQ page or contact support for your specific order.' };
  }
  if (/(order status|track order|my order|where is my order|djs-)/.test(m)) {
    const oid = m.match(/djs-[a-z0-9]+/i);
    return { reply: `You can track your order on the Track Order page with your Order ID${oid ? ` (${oid[0].toUpperCase()})` : ''} and the email used at checkout. Go to /track. If it shows Pending Verification, our team is still confirming your payment in the bank/UPI app.` };
  }
  if (/(contact|support|human|help me|whatsapp|call|phone|email|instagram)/.test(m)) {
    const wa = ctx.whatsapp?.display || (ctx.whatsapp?.number ? `+${ctx.whatsapp.number}` : null);
    const email = ctx.site?.support_email;
    const ig = ctx.site?.instagram_handle;
    const parts = [];
    if (wa) parts.push(`WhatsApp or call ${wa}`);
    if (email) parts.push(`email ${email}`);
    if (ig) parts.push(`Instagram ${ig}`);
    return { reply: `You can reach the team directly${parts.length ? `: ${parts.join(' • ')}` : ' via the Contact page'}. Links are on the Contact page and in the footer. For order issues, keep your Order ID (DJS-...) handy.` };
  }
  const faq = ctx.faqs.find((f) => {
    const words = f.question.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    return words.some((w) => m.includes(w));
  });
  if (faq) return { reply: `${faq.answer}` };
  if (/(thank|thanks|great|nice|awesome)/.test(m)) {
    return { reply: pick('Anytime! Happy mixing.', 'You got it. Need anything else about the catalogue?', 'Enjoy the music! Anything else I can help with?') };
  }
  return { reply: "I don't have a reliable answer for that, and I never make up product or policy details. Please check the Catalogue / FAQ pages, or contact support via the Contact page or WhatsApp button and the team will help you out." };
}

async function aiReply(message, history, ctx) {
  const base = (process.env.AI_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const catalogue = ctx.products.map((p) => ({
    name: p.name, slug: p.slug, price: p.price, original_price: p.original_price,
    genre: p.genres?.name, tracks: p.track_count, bestseller: p.is_bestseller, tags: p.tags,
  }));
  const system = `You are the DJ SHAGGY store assistant for a premium DJ playlist marketplace.
RULES:
- Only recommend products, bundles, prices, track counts and discounts from the CATALOGUE JSON below. NEVER invent products, prices, discounts, policies or delivery links.
- Delivery: Google Drive links emailed after manual payment verification. Payment: manual UPI to ${ctx.payment?.upi_id || 'the UPI ID shown at checkout'} with UTR + screenshot submission; no automatic approval.
- If unsure or asked about anything not in the data, say so and direct to support (Contact page / WhatsApp ${ctx.whatsapp?.number ? '+' + ctx.whatsapp.number : 'button on site'}).
- Be concise (max ~120 words), friendly, use short lines. Mention exact prices in INR (₹).
CATALOGUE JSON:
${JSON.stringify({ products: catalogue, bundles: ctx.bundles, genres: ctx.genres.map((g) => g.name), faqs: ctx.faqs })}
`;
  const messages = [{ role: 'system', content: system }];
  (Array.isArray(history) ? history.slice(-6) : []).forEach((h) => {
    if (h?.role === 'user' || h?.role === 'assistant') messages.push({ role: h.role, content: String(h.content).slice(0, 800) });
  });
  messages.push({ role: 'user', content: message });
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 350 }),
  });
  if (!r.ok) throw new Error(`AI API error ${r.status}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() || null;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rl = rateLimit(req, { key: 'chat', limit: 30, windowMs: 60000 });
  if (rl.limited) return res.status(429).json({ error: `Too many messages — please retry in ${rl.retryAfter}s` });

  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'message is required' });
    const ctx = await loadContext();

    if (process.env.AI_API_KEY) {
      try {
        const reply = await aiReply(message.slice(0, 800), history, ctx);
        if (reply) return res.status(200).json({ reply, engine: 'ai' });
      } catch (e) {
        console.error('AI chat failed, using local engine:', e.message);
      }
    }
    const out = localReply(message, ctx);
    return res.status(200).json({ ...out, engine: 'assistant' });
  } catch (err) {
    logApi('chat', req, 500, err.message);
    res.status(500).json({ error: 'Chat is temporarily unavailable. Please use the Contact page.' });
  }
}
