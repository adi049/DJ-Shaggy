import supabase from './db-client.js';
import { setCors, verifyAdmin, PUBLIC_PRODUCT_COLS, slugify, audit } from './_utils.js';

const ADMIN_COLS = '*,genres(id,name,slug,accent),product_meta(preview_audio_url,sort_order,is_available),collection_products(collection_id)';
const META_COLS = ',product_meta(preview_audio_url,sort_order,is_available),collection_products(collection_id)';

// Flatten the 1:1 meta table onto the product and apply availability + manual ordering.
function flatten(list, { admin }) {
  let out = (list || []).map((p) => {
    const m = Array.isArray(p.product_meta) ? p.product_meta[0] : p.product_meta;
    const cps = Array.isArray(p.collection_products) ? p.collection_products : [];
    const collectionIds = [...new Set([p.collection_id, ...cps.map((c) => c.collection_id)].filter(Boolean))];
    return {
      ...p,
      preview_audio_url: m?.preview_audio_url || '',
      sort_order: m?.sort_order ?? 0,
      is_available: m?.is_available !== false,
      collection_ids: collectionIds,
      product_meta: undefined,
      collection_products: undefined,
    };
  });
  if (!admin) out = out.filter((p) => p.is_available);
  return out;
}

async function saveMeta(id, body) {
  const row = {
    product_id: id,
    preview_audio_url: String(body.preview_audio_url || ''),
    sort_order: parseInt(body.sort_order, 10) || 0,
    is_available: body.is_available !== false,
  };
  await supabase.from('product_meta').upsert(row, { onConflict: 'product_id' });
}

async function saveCollections(id, body) {
  if (!Array.isArray(body.collection_ids)) return; // only rewrite when the editor sends the array
  const ids = [...new Set(body.collection_ids.map(Number).filter(Boolean))].slice(0, 20);
  await supabase.from('collection_products').delete().eq('product_id', id);
  if (ids.length) {
    await supabase.from('collection_products').insert(ids.map((cid) => ({ product_id: id, collection_id: cid })));
  }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const isAdminReq = req.query.admin === '1';
      let admin = false;
      if (isAdminReq) {
        const a = await verifyAdmin(req);
        if (!a.ok) return res.status(a.status).json({ error: a.error });
        admin = true;
      }
      const cols = (admin ? ADMIN_COLS : PUBLIC_PRODUCT_COLS + META_COLS);
      const { slug, genre, collection, q, tag, bestseller, featured, status, sort, ids, limit, price_min, price_max, min_tracks } = req.query;

      let query = supabase.from('products').select(cols);
      if (!admin) query = query.eq('status', 'published');
      else if (status && status !== 'all') query = query.eq('status', status);

      if (slug) query = query.eq('slug', slug);
      if (ids) query = query.in('id', String(ids).split(',').map((n) => parseInt(n, 10)).filter(Boolean));
      if (bestseller === '1') query = query.eq('is_bestseller', true);
      if (featured === '1') query = query.eq('is_featured', true);
      if (collection) {
        const cid = parseInt(collection, 10);
        // Multi-collection: primary collection_id OR membership via join table.
        const { data: links } = await supabase.from('collection_products').select('product_id').eq('collection_id', cid);
        const linkedIds = (links || []).map((l) => l.product_id);
        query = linkedIds.length
          ? query.or(`collection_id.eq.${cid},id.in.(${linkedIds.join(',')})`)
          : query.eq('collection_id', cid);
      }
      if (genre) {
        const gid = parseInt(genre, 10);
        if (!isNaN(gid)) query = query.eq('genre_id', gid);
        else {
          const { data: g } = await supabase.from('genres').select('id').eq('slug', genre).maybeSingle();
          if (g) query = query.eq('genre_id', g.id);
          else return res.status(200).json(slug ? { product: null, related: [] } : []);
        }
      }
      if (tag) query = query.contains('tags', JSON.stringify([tag]));
      if (price_min) query = query.gte('price', Number(price_min) || 0);
      if (price_max) query = query.lte('price', Number(price_max) || 999999);
      if (min_tracks) query = query.gte('track_count', parseInt(min_tracks, 10) || 0);
      if (q) {
        // Quote-wrap values so dots/commas/parens match literally (e.g. "Vol. 12"),
        // and strip PostgREST wildcards/quotes from user input.
        const safe = String(q).replace(/["%_]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
        if (safe) query = query.or(`name.ilike."%${safe}%",description.ilike."%${safe}%"`);
      }

      const explicitSort = ['price_asc', 'price_desc', 'name', 'tracks', 'popular'].includes(sort);
      switch (sort) {
        case 'popular': query = query.order('is_bestseller', { ascending: false }).order('created_at', { ascending: false }); break;
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'name': query = query.order('name', { ascending: true }); break;
        case 'tracks': query = query.order('track_count', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
      }
      if (limit) query = query.limit(parseInt(limit, 10));

      const { data, error } = await query;
      if (error) throw error;

      let rows = flatten(data, { admin });
      // Default (no explicit sort): admin-defined manual order first, then newest.
      if (!explicitSort) {
        rows = rows.sort((a, b) => (a.sort_order - b.sort_order) || (new Date(b.created_at) - new Date(a.created_at)));
      }

      if (slug) {
        const product = rows[0] || null;
        let related = [];
        if (product) {
          let rq = supabase.from('products').select(PUBLIC_PRODUCT_COLS + META_COLS).eq('status', 'published').neq('id', product.id).limit(4);
          if (product.genre_id) rq = rq.eq('genre_id', product.genre_id);
          const { data: rel } = await rq;
          related = flatten(rel, { admin: false });
        }
        return res.status(200).json({ product, related });
      }
      return res.status(200).json(rows);
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      const a = await verifyAdmin(req);
      if (!a.ok) return res.status(a.status).json({ error: a.error });

      if (req.method === 'POST') {
        const p = req.body || {};
        if (!p.name) return res.status(400).json({ error: 'Name is required' });
        let slug = p.slug ? slugify(p.slug) : slugify(p.name);
        const { data: clash } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle();
        if (clash) slug = `${slug}-${Date.now().toString(36)}`;
        const row = sanitizeProduct(p);
        row.slug = slug;
        const { data, error } = await supabase.from('products').insert(row).select('id').single();
        if (error) throw error;
        await saveMeta(data.id, p);
        await saveCollections(data.id, p);
        await audit(a.user.email, 'product.create', row.name);
        const { data: fresh } = await supabase.from('products').select(ADMIN_COLS).eq('id', data.id).single();
        return res.status(201).json(flatten([fresh], { admin: true })[0]);
      }

      if (req.method === 'PUT') {
        const p = req.body || {};
        if (!p.id) return res.status(400).json({ error: 'id is required' });
        const row = sanitizeProduct(p);
        if (p.slug) row.slug = slugify(p.slug);
        const { error } = await supabase.from('products').update(row).eq('id', p.id);
        if (error) throw error;
        await saveMeta(p.id, p);
        await saveCollections(p.id, p);
        await audit(a.user.email, 'product.update', `#${p.id} ${row.name || ''} (${row.status})`);
        const { data: fresh } = await supabase.from('products').select(ADMIN_COLS).eq('id', p.id).single();
        return res.status(200).json(flatten([fresh], { admin: true })[0]);
      }

      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await audit(a.user.email, 'product.delete', `#${id}`);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('products API error:', err);
    res.status(500).json({ error: err.message });
  }
}

function sanitizeProduct(p) {
  const row = {
    name: String(p.name || '').slice(0, 160),
    description: String(p.description || ''),
    price: Math.max(0, Number(p.price) || 0),
    original_price: p.original_price ? Number(p.original_price) : null,
    track_count: Math.max(0, parseInt(p.track_count, 10) || 0),
    tags: Array.isArray(p.tags) ? p.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 12) : [],
    is_bestseller: !!p.is_bestseller,
    is_featured: !!p.is_featured,
    status: p.status === 'published' ? 'published' : 'draft',
    artwork_url: String(p.artwork_url || ''),
    preview_note: String(p.preview_note || ''),
    genre_id: p.genre_id || null,
    collection_id: p.collection_id || null,
    delivery_link: String(p.delivery_link || ''),
    drive_folder_id: String(p.drive_folder_id || ''),
    drive_folder_url: String(p.drive_folder_url || ''),
  };
  return row;
}
