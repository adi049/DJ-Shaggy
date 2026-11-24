import supabase from './db-client.js';
import { setCors, verifyAdmin, driveConfig, driveFetchJson, slugify, rateLimit, logApi } from './_utils.js';

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const ZIP_MIMES = ['application/zip', 'application/x-zip-compressed'];
const IMPORTABLE = (f) => f.mime?.startsWith('audio/') || ZIP_MIMES.includes(f.mime) || /\.zip$/i.test(f.name || '');

const SETUP_STEPS = [
  'Create a Google Cloud project at console.cloud.google.com and enable the Google Drive API.',
  'Option A (API key): create an API key under Credentials and set env GOOGLE_DRIVE_API_KEY. Share every mapped folder as "Anyone with the link can view".',
  'Option B (service account): create a service account + JSON key, set env GOOGLE_SERVICE_ACCOUNT_JSON to the full JSON. Share each mapped folder with the service account email (…iam.gserviceaccount.com) as Viewer.',
  'Redeploy after setting environment variables. Folder IDs are already mapped here — no further mapping needed.',
];

/* Crawl a folder recursively (depth ≤ 4), with pagination, returning flat file list. */
async function crawlFolder(rootId, cfg) {
  const FIELDS = 'nextPageToken, files(id,name,mimeType,size,modifiedTime)';
  const out = [];
  const visited = new Set([rootId]);

  async function walk(folderId, path, depth) {
    let pageToken = '';
    do {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and trashed=false`,
        fields: FIELDS,
        pageSize: '1000',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const j = await driveFetchJson(params, cfg);
      for (const f of j.files || []) {
        if (f.mimeType === FOLDER_MIME) {
          if (depth < 4 && !visited.has(f.id)) {
            visited.add(f.id);
            await walk(f.id, `${path}${f.name}/`, depth + 1);
          }
        } else {
          out.push({
            file_id: f.id,
            name: f.name,
            mime: f.mimeType || '',
            size_bytes: Number(f.size) || 0,
            modified_at: f.modifiedTime || null,
            parent_id: folderId,
            parent_path: path,
          });
        }
      }
      pageToken = j.nextPageToken || '';
    } while (pageToken);
  }

  await walk(rootId, '/', 0);
  return out;
}

function driveErrorMessage(e) {
  if (e.status === 403) return 'Permission denied (403). Share the mapped folders with the API key audience ("Anyone with the link can view") or with your service account email as Viewer.';
  if (e.status === 404) return 'Folder not found (404). Check the folder ID mapping.';
  if (e.status === 429) return 'Drive API rate limit hit (429). Wait a minute and sync again — backoff was applied automatically.';
  return e.message;
}

async function syncMapping(mapping) {
  const cfg = driveConfig();
  if (!cfg.configured) {
    const error = 'Google Drive credentials are missing — sync cannot run. See setup steps below.';
    await supabase.from('drive_mappings').update({ last_status: 'error', last_error: 'Credentials missing' }).eq('id', mapping.id);
    await supabase.from('drive_sync_log').insert({ mapping_id: mapping.id, mapping_name: mapping.name, status: 'error', error: 'Credentials missing (GOOGLE_DRIVE_API_KEY / GOOGLE_SERVICE_ACCOUNT_JSON not set)' });
    return { ok: false, configured: false, error, steps: SETUP_STEPS };
  }

  try {
    const files = await crawlFolder(mapping.folder_id, cfg);

    const { data: existingRows } = await supabase
      .from('drive_files').select('id,file_id,size_bytes,modified_at,status').eq('mapping_id', mapping.id);
    const byId = new Map((existingRows || []).map((r) => [r.file_id, r]));

    const freshIds = new Set(files.map((f) => f.file_id));
    const newFiles = [];
    let updated = 0;
    for (const f of files) {
      const ex = byId.get(f.file_id);
      if (!ex) newFiles.push(f);
      else if (String(ex.size_bytes) !== String(f.size_bytes) || ex.modified_at !== f.modified_at) {
        await supabase.from('drive_files').update({ size_bytes: f.size_bytes, modified_at: f.modified_at, name: f.name }).eq('id', ex.id);
        updated++;
      }
    }
    // Files missing from Drive are NEVER deleted — only counted for the log.
    const missing = (existingRows || []).filter((r) => !freshIds.has(r.file_id)).length;

    if (newFiles.length) {
      const rows = newFiles.map((f) => ({ ...f, mapping_id: mapping.id, status: 'staged' }));
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from('drive_files').insert(rows.slice(i, i + 200));
        if (error) throw error;
      }
    }

    await supabase.from('drive_mappings').update({
      last_synced_at: new Date().toISOString(),
      last_status: 'ok',
      last_error: null,
      file_count: files.length,
    }).eq('id', mapping.id);

    await supabase.from('drive_sync_log').insert({
      mapping_id: mapping.id, mapping_name: mapping.name, status: 'ok',
      files_found: files.length, files_new: newFiles.length, files_missing: missing,
    });

    return { ok: true, mapping: mapping.name, found: files.length, new: newFiles.length, updated, missing };
  } catch (e) {
    const msg = driveErrorMessage(e);
    await supabase.from('drive_mappings').update({ last_status: 'error', last_error: msg.slice(0, 400) }).eq('id', mapping.id);
    await supabase.from('drive_sync_log').insert({ mapping_id: mapping.id, mapping_name: mapping.name, status: 'error', error: msg.slice(0, 400) });
    return { ok: false, mapping: mapping.name, status: e.status, error: msg };
  }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const a = await verifyAdmin(req);
    if (!a.ok) return res.status(a.status).json({ error: a.error });

    const rl = rateLimit(req, { key: 'drive', limit: 30, windowMs: 60000 });
    if (rl.limited) return res.status(429).json({ error: `Too many requests — retry in ${rl.retryAfter}s` });

    const action = req.query.action || req.body?.action || 'list';

    /* ---------- List mappings + recent history ---------- */
    if (action === 'list') {
      const cfg = driveConfig();
      const [{ data: mappings }, { data: logs }, { data: staged }] = await Promise.all([
        supabase.from('drive_mappings').select('*').order('name', { ascending: true }),
        supabase.from('drive_sync_log').select('*').order('created_at', { ascending: false }).limit(12),
        supabase.from('drive_files').select('mapping_id,status'),
      ]);
      const stagedCount = {};
      (staged || []).forEach((f) => {
        if (f.status === 'staged') stagedCount[f.mapping_id] = (stagedCount[f.mapping_id] || 0) + 1;
      });
      return res.status(200).json({
        configured: cfg.configured,
        mode: cfg.sa ? 'service-account' : cfg.apiKey ? 'api-key' : null,
        mappings: (mappings || []).map((m) => ({ ...m, staged_count: stagedCount[m.id] || 0 })),
        logs: logs || [],
      });
    }

    /* ---------- Add / edit / remove mappings ---------- */
    if (action === 'add') {
      const { folder_id, name, note } = req.body || {};
      const fid = String(folder_id || '').trim();
      if (!/^[A-Za-z0-9_-]{10,}$/.test(fid)) return res.status(400).json({ error: 'Invalid Google Drive folder ID format' });
      if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
      const { data: clash } = await supabase.from('drive_mappings').select('id').eq('folder_id', fid).maybeSingle();
      if (clash) return res.status(400).json({ error: 'That folder is already mapped' });
      const { data, error } = await supabase.from('drive_mappings').insert({ folder_id: fid, name: name.trim(), note: note || '' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (action === 'update') {
      const { id, name, note, enabled } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('drive_mappings')
        .update({ name: String(name || '').slice(0, 160), note: String(note || '').slice(0, 500), enabled: !!enabled })
        .eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (action === 'remove') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      // Cascades staged drive_files only — never touches products.
      const { error } = await supabase.from('drive_mappings').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    /* ---------- Sync one / all ---------- */
    if (action === 'sync') {
      const { mapping_id } = req.body?.mapping_id ? req.body : req.query;
      const depth = Math.min(8, Math.max(1, parseInt(req.body?.depth || req.query.depth, 10) || 4));
      const { data: m } = await supabase.from('drive_mappings').select('*').eq('id', mapping_id).maybeSingle();
      if (!m) return res.status(404).json({ error: 'Mapping not found' });
      const result = await syncMapping(m, depth);
      return res.status(result.ok ? 200 : result.configured === false ? 400 : result.status === 409 ? 409 : 502).json(result);
    }

    if (action === 'sync_all') {
      const { data: mappings } = await supabase.from('drive_mappings').select('*').eq('enabled', true);
      const results = [];
      for (const m of mappings || []) results.push(await syncMapping(m));
      return res.status(200).json({ results });
    }

    /* ---------- Review staged files ---------- */
    if (action === 'files') {
      // Paginated: safe for folders with more than 2,000 staged records.
      const mapping_id = req.query.mapping_id;
      const rows = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        let q = supabase.from('drive_files').select('*')
          .order('parent_path', { ascending: true }).order('name', { ascending: true })
          .range(from, from + PAGE - 1);
        if (mapping_id) q = q.eq('mapping_id', mapping_id);
        if (req.query.status) q = q.eq('status', req.query.status);
        const { data, error } = await q;
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < PAGE) break;
        if (from > 20000) break; // hard safety cap
      }
      return res.status(200).json(rows.map((f) => ({ ...f, importable: IMPORTABLE(f) })));
    }

    /* ---------- Import selected files as DRAFT products (grouped by folder) ---------- */
    if (action === 'import') {
      const ids = Array.isArray(req.body?.file_ids) ? req.body.file_ids.map(Number).filter(Boolean) : [];
      if (!ids.length) return res.status(400).json({ error: 'No files selected' });
      const { data: files } = await supabase.from('drive_files').select('*').in('id', ids.slice(0, 500));
      const staged = (files || []).filter((f) => f.status === 'staged' && IMPORTABLE(f));
      if (!staged.length) return res.status(400).json({ error: 'None of the selected files are importable (audio/ZIP) or they are already imported' });

      const groups = new Map();
      for (const f of staged) {
        const key = f.parent_id;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(f);
      }

      const created = [];
      const skipped = [];
      for (const [parentId, groupFiles] of groups) {
        // Duplicate prevention: never recreate a product for the same Drive folder.
        const { data: existing } = await supabase.from('products').select('id,name').eq('drive_folder_id', parentId).maybeSingle();
        if (existing) {
          skipped.push(`${groupFiles[0].parent_path || '/'} (already linked to "${existing.name}")`);
          await supabase.from('drive_files').update({ status: 'imported', product_id: existing.id }).in('id', groupFiles.map((f) => f.id));
          continue;
        }
        const path = groupFiles[0].parent_path || '/';
        const parts = path.split('/').filter(Boolean);
        const name = parts[parts.length - 1] || groupFiles[0].name.replace(/\.[^.]+$/, '');
        let slug = slugify(name);
        const { data: clash } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle();
        if (clash) slug = `${slug}-${Date.now().toString(36)}`;
        const folderUrl = `https://drive.google.com/drive/folders/${parentId}`;
        const audioCount = groupFiles.filter((f) => f.mime?.startsWith('audio/')).length;
        const { data: product, error } = await supabase.from('products').insert({
          name,
          slug,
          description: '',
          price: 0,
          track_count: audioCount || groupFiles.length,
          tags: [],
          status: 'draft', // Imports are NEVER auto-published.
          artwork_url: '',
          delivery_link: folderUrl,
          drive_folder_id: parentId,
          drive_folder_url: folderUrl,
        }).select('id,name').single();
        if (error) { skipped.push(`${name} (${error.message})`); continue; }
        await supabase.from('drive_files').update({ status: 'imported', product_id: product.id }).in('id', groupFiles.map((f) => f.id));
        created.push({ id: product.id, name: product.name, files: groupFiles.length });
      }
      return res.status(200).json({ ok: true, created, skipped });
    }

    /* ---------- Tracks linked to a product (download mapping view) ---------- */
    if (action === 'tracks') {
      const product_id = parseInt(req.query.product_id || '0', 10);
      if (!product_id) return res.status(400).json({ error: 'product_id is required' });
      const { data, error } = await supabase.from('drive_files')
        .select('id,file_id,name,mime,size_bytes,modified_at,parent_path,status')
        .eq('product_id', product_id)
        .order('name', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    /* ---------- Unlink a track from its product (back to staged review) ---------- */
    if (action === 'unlink_file') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('drive_files')
        .update({ product_id: null, status: 'staged' }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    /* ---------- Publish selected imported products (explicit admin action only) ---------- */
    if (action === 'publish') {
      const ids = Array.isArray(req.body?.product_ids) ? req.body.product_ids.map(Number).filter(Boolean) : [];
      if (!ids.length) return res.status(400).json({ error: 'No products selected' });
      const { data, error } = await supabase.from('products').update({ status: 'published' }).in('id', ids.slice(0, 100)).select('id,name,status');
      if (error) throw error;
      return res.status(200).json({ ok: true, published: data });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    logApi('drive-mappings', req, 500, err.message);
    res.status(500).json({ error: 'Drive operation failed' });
  }
}
