import supabase from './db-client.js';
import { setCors, verifyAdmin, rateLimit, originGuard, logApi } from './_utils.js';
import crypto from 'crypto';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'];
const ZIP_TYPES = ['application/zip', 'application/x-zip-compressed'];
// Vercel serverless bodies cap around ~4.5 MB; base64 inflates ~33%. Keep under it.
const MAX_IMAGE = 3 * 1024 * 1024;
const MAX_AUDIO = 3 * 1024 * 1024;
const WRITABLE_BUCKETS = ['artwork', 'media', 'payments', 'content'];

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    /* ---------- DELETE a stored object (admin only, for safe cleanup) ---------- */
    if (req.method === 'DELETE') {
      const a = await verifyAdmin(req);
      if (!a.ok) return res.status(a.status).json({ error: a.error });
      const { bucket, path } = req.body || {};
      if (!WRITABLE_BUCKETS.includes(bucket) || !path || path.includes('..')) {
        return res.status(400).json({ error: 'Invalid bucket or path' });
      }
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const og = originGuard(req);
    if (!og.ok) return res.status(403).json({ error: og.error });

    const { kind, fileName, fileBase64, contentType } = req.body || {};
    if (!fileBase64 || !contentType) return res.status(400).json({ error: 'fileBase64 and contentType are required' });

    const isAudio = AUDIO_TYPES.includes(contentType);
    const isImage = IMAGE_TYPES.includes(contentType);
    const isZip = ZIP_TYPES.includes(contentType);
    if (!isAudio && !isImage && !isZip) return res.status(400).json({ error: 'Only images (PNG/JPG/WebP), audio (MP3/WAV/M4A) or ZIP are allowed' });

    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length > MAX_IMAGE) {
      return res.status(400).json({ error: 'File too large (max 3 MB \u2014 serverless request limit). Host full packs in Google Drive instead.' });
    }

    const ext = isZip ? 'zip' : isAudio
      ? (contentType.includes('wav') ? 'wav' : contentType.includes('mp4') || contentType.includes('m4a') ? 'm4a' : 'mp3')
      : contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const rand = crypto.randomBytes(6).toString('hex');
    const safe = String(fileName || 'file').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);

    // Customer payment screenshots: public endpoint, private bucket, random path.
    if (kind === 'payment') {
      const rl = rateLimit(req, { key: 'payment-upload', limit: 10, windowMs: 60000 });
      if (rl.limited) return res.status(429).json({ error: `Too many uploads — please retry in ${rl.retryAfter}s` });
      if (!isImage) return res.status(400).json({ error: 'Screenshots must be images' });
      const path = `shots/${Date.now()}-${rand}.${ext}`;
      const { error } = await supabase.storage.from('payments').upload(path, buffer, { contentType, upsert: false });
      if (error) throw error;
      return res.status(200).json({ path });
    }

    // Everything below is admin-only media: artwork / gallery / banners / audio / avatars / QR.
    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    let bucket = 'artwork';
    let folder = 'artwork';
    if (kind === 'gallery') { bucket = 'media'; folder = 'gallery'; }
    else if (kind === 'audio') { bucket = 'media'; folder = 'audio'; if (!isAudio) return res.status(400).json({ error: 'Audio kind requires an audio file' }); }
    else if (kind === 'banner') { bucket = 'media'; folder = 'banners'; }
    else if (kind === 'content') {
      // Private purchased-content files: products/<id>/<file>
      bucket = 'content';
      const pid = parseInt(req.body.product_id, 10);
      if (!pid) return res.status(400).json({ error: 'product_id is required for content uploads' });
      if (!isAudio && !isZip && !isImage) return res.status(400).json({ error: 'Content files must be audio, ZIP or image' });
      folder = `products/${pid}`;
    }
    else if (kind !== 'artwork') return res.status(400).json({ error: 'Unknown upload kind' });
    if ((kind === 'artwork' || kind === 'gallery' || kind === 'banner') && !isImage) return res.status(400).json({ error: 'This upload requires an image file' });

    const path = `${folder}/${Date.now()}-${rand}-${safe}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return res.status(200).json({ url: urlData.publicUrl, path, bucket });
  } catch (err) {
    logApi('upload', req, 500, err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
}
