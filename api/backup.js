import supabase from './db-client.js';
import { setCors, verifyAdmin, rateLimit, logApi } from './_utils.js';

const TABLES = [
  'products', 'product_meta', 'genres', 'collections', 'collection_products', 'bundles',
  'orders', 'order_events', 'faqs', 'coupons', 'messages', 'settings',
  'drive_mappings', 'drive_files', 'drive_sync_log', 'drive_import_log',
  'home_sections', 'banners', 'gallery',
];

// Admin-only JSON snapshot of every table (database-level pg_dump is not available
// on this platform; this is the supported in-app backup). No storage binaries are
// exported — files remain in Supabase Storage and are referenced by URL/path.
async function exportTable(t) {
  // Paginated export — safe for tables larger than 1000 rows.
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(t).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`${t}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
    if (from > 50000) break; // hard safety cap
  }
  return rows;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const a = await verifyAdmin(req);
    if (!a.ok) { logApi('backup', req, a.status); return res.status(a.status).json({ error: a.error }); }

    const rl = rateLimit(req, { key: 'backup', limit: 5, windowMs: 60000 });
    if (rl.limited) return res.status(429).json({ error: `Too many backup operations — retry in ${rl.retryAfter}s` });

    if (req.method === 'POST') {
      const backup = req.body?.backup;
      if (!backup || typeof backup !== 'object' || !backup.tables) {
        return res.status(400).json({ error: 'Invalid backup file (expected { tables: { ... } })' });
      }
      const known = new Set(TABLES);
      const preview = [];
      for (const [table, rows] of Object.entries(backup.tables)) {
        preview.push({ table, rows: Array.isArray(rows) ? rows.length : 0, recognized: known.has(table) });
      }
      const unknown = preview.filter((p) => !p.recognized).map((p) => p.table);

      // Stage 1 (default): validate + preview only. Never writes.
      if (req.body?.action !== 'restore') {
        logApi('backup', req, 200, `restore preview: ${preview.length} tables`);
        return res.status(200).json({
          ok: true,
          preview: true,
          exported_at: backup.exported_at || null,
          tables: preview,
          unknown_tables: unknown,
          message: 'Preview only — no data written. To restore, confirm explicitly.',
        });
      }

      // Stage 2: safeguarded, non-destructive restore (upserts only; never deletes).
      if (req.body?.confirm !== 'RESTORE') {
        return res.status(400).json({ error: 'Restore requires confirm: "RESTORE"' });
      }
      const CONFLICT_KEYS = { settings: 'key', product_meta: 'product_id' };
      const MAX_ROWS = 10000;
      const results = [];
      for (const p of preview) {
        if (!p.recognized) { results.push({ table: p.table, status: 'skipped (unknown table)' }); continue; }
        if (p.rows > MAX_ROWS) { results.push({ table: p.table, status: `skipped (${p.rows} rows exceed ${MAX_ROWS} safety cap)` }); continue; }
        if (p.rows === 0) { results.push({ table: p.table, status: 'ok', upserted: 0 }); continue; }
        const rows = backup.tables[p.table].filter((r) => r && typeof r === 'object' && !Array.isArray(r));
        if (!rows.length) { results.push({ table: p.table, status: 'skipped (no valid row objects)' }); continue; }
        const conflictKey = CONFLICT_KEYS[p.table] || 'id';
        const missingPk = rows.filter((r) => r[conflictKey] === undefined || r[conflictKey] === null).length;
        if (missingPk) { results.push({ table: p.table, status: `skipped (${missingPk} rows missing primary key '${conflictKey}')` }); continue; }
        try {
          for (let i = 0; i < rows.length; i += 200) {
            const { error } = await supabase.from(p.table).upsert(rows.slice(i, i + 200), { onConflict: conflictKey });
            if (error) throw error;
          }
          results.push({ table: p.table, status: 'ok', upserted: rows.length });
        } catch (e) {
          results.push({ table: p.table, status: `error: ${String(e.message).slice(0, 160)}` });
        }
      }
      logApi('backup', req, 200, `RESTORE executed: ${results.filter((r) => r.status === 'ok').length}/${preview.length} tables`);
      return res.status(200).json({
        ok: true,
        preview: false,
        restored: results,
        note: 'Non-destructive restore completed — rows were upserted, nothing was deleted. Verify in the admin panel.',
      });
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const out = { exported_at: new Date().toISOString(), app: 'djshaggy', tables: {} };
    for (const t of TABLES) {
      out.tables[t] = await exportTable(t);
    }
    logApi('backup', req, 200, `exported ${TABLES.length} tables`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="djshaggy-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    return res.status(200).json(out);
  } catch (err) {
    logApi('backup', req, 500, err.message);
    res.status(500).json({ error: 'Backup failed' });
  }
}
