import { useEffect, useMemo, useState } from 'react';
import {
  FolderDown, CheckCircle2, AlertTriangle, FolderOpen, Import, Info,
  Plus, Pencil, Trash2, X, Play, PlayCircle, Eye, EyeOff, Loader2, FileAudio, FileArchive,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../lib/api';
import { AdminHeader, inputCls, Field } from './AdminLayout';
import { Loader, EmptyState } from '../../components/UI';
import { useEsc } from '../../hooks/useEsc';
import { cx, fmtDate } from '../../lib/utils';

interface Mapping {
  id: number; folder_id: string; name: string; note: string; enabled: boolean;
  last_synced_at: string | null; last_status: string; last_error: string | null;
  file_count: number; staged_count: number; created_at?: string;
}
interface SyncLog {
  id: number; mapping_name: string; status: string; files_found: number;
  files_new: number; files_missing: number; error: string | null; created_at: string;
}
interface DriveFile {
  id: number; file_id: string; name: string; mime: string; size_bytes: number;
  modified_at: string | null; parent_path: string; status: string; importable: boolean;
}
interface CreatedDraft { id: number; name: string; files: number }

function fmtSize(n: number) {
  if (!n) return '—';
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DriveAdmin() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<number, string>>({});
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [editMap, setEditMap] = useState<Partial<Mapping> | null>(null);
  const [adding, setAdding] = useState(false);
  const [review, setReview] = useState<Mapping | null>(null);

  useEsc(!!editMap, () => setEditMap(null));
  useEsc(!!review, () => setReview(null));

  const load = async () => {
    try {
      const d = await apiFetch<{ configured: boolean; mappings: Mapping[]; logs: SyncLog[] }>(
        '/api/drive-mappings?action=list', { auth: true });
      setConfigured(d.configured);
      setMappings(d.mappings);
      setLogs(d.logs);
    } catch { setConfigured(false); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const syncOne = async (m: Mapping) => {
    setSyncing((s) => ({ ...s, [m.id]: 'syncing' }));
    setBanner(null);
    try {
      const r = await apiFetch<any>('/api/drive-mappings', { method: 'POST', auth: true, body: { action: 'sync', mapping_id: m.id } });
      setBanner({ ok: true, text: `${m.name}: found ${r.found} files (${r.new} new, ${r.missing} missing — kept, never deleted)` });
    } catch (e: any) {
      setBanner({ ok: false, text: `${m.name}: ${e.message}` });
    } finally {
      setSyncing((s) => ({ ...s, [m.id]: '' }));
      load();
    }
  };

  const syncAll = async () => {
    const enabled = mappings.filter((m) => m.enabled);
    setBanner(null);
    const results: string[] = [];
    for (const m of enabled) {
      setSyncing((s) => ({ ...s, [m.id]: 'syncing' }));
      try {
        const r = await apiFetch<any>('/api/drive-mappings', { method: 'POST', auth: true, body: { action: 'sync', mapping_id: m.id } });
        results.push(`✓ ${m.name}: ${r.found} files, ${r.new} new`);
      } catch (e: any) {
        results.push(`✗ ${m.name}: ${e.message}`);
      }
      setSyncing((s) => ({ ...s, [m.id]: '' }));
    }
    setBanner({ ok: results.every((r) => r.startsWith('✓')), text: results.join('  •  ') });
    load();
  };

  const saveMapping = async () => {
    if (!editMap) return;
    try {
      if (adding) {
        await apiFetch('/api/drive-mappings', { method: 'POST', auth: true, body: { action: 'add', folder_id: editMap.folder_id, name: editMap.name, note: editMap.note } });
      } else {
        await apiFetch('/api/drive-mappings', { method: 'POST', auth: true, body: { action: 'update', id: editMap.id, name: editMap.name, note: editMap.note, enabled: editMap.enabled } });
      }
      setEditMap(null); setAdding(false); load();
    } catch (e: any) { setBanner({ ok: false, text: e.message }); }
  };

  const removeMapping = async (m: Mapping) => {
    if (!confirm(`Remove mapping "${m.name}"? Staged file records are deleted too, but imported products stay untouched.`)) return;
    await apiFetch('/api/drive-mappings', { method: 'POST', auth: true, body: { action: 'remove', id: m.id } }).catch(() => {});
    load();
  };

  const toggleEnabled = async (m: Mapping) => {
    await apiFetch('/api/drive-mappings', { method: 'POST', auth: true, body: { action: 'update', id: m.id, name: m.name, note: m.note, enabled: !m.enabled } }).catch(() => {});
    load();
  };

  if (loading) return <Loader />;

  return (
    <div>
      <AdminHeader
        title="Google Drive Manager"
        sub="Map playlist folders, sync real file metadata, review staged files, import as drafts and publish when ready. Imports are never auto-published and missing files never delete products."
        right={<div className="flex gap-2">
          <button onClick={() => { setAdding(true); setEditMap({ folder_id: '', name: '', note: '', enabled: true }); }}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
            <Plus size={14} /> Add mapping
          </button>
          <button onClick={syncAll} disabled={!configured || Object.values(syncing).some(Boolean)}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink hover:bg-gold-soft disabled:opacity-40">
            <PlayCircle size={14} /> Sync all enabled
          </button>
        </div>}
      />

      {/* Connection status */}
      <div className={cx('mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm',
        configured ? 'border-jade/30 bg-jade/10 text-jade' : 'border-amber-400/30 bg-amber-400/5 text-amber-200/90')}>
        {configured ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0" />}
        <div>
          {configured ? (
            <p>Drive credentials present — sync is ready. Folders still need the right sharing (public link or service-account Viewer access), otherwise a 403 is reported per folder.</p>
          ) : (
            <div>
              <p className="font-semibold">Drive credentials are not configured — sync cannot run, and nothing here is simulated.</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[11px] leading-relaxed">
                <li>Create a Google Cloud project at <span className="font-mono">console.cloud.google.com</span> and enable the <em>Google Drive API</em>.</li>
                <li><strong>Option A (API key):</strong> Credentials → Create API key → set env <code>GOOGLE_DRIVE_API_KEY</code>. Share every mapped folder: right-click → Share → "Anyone with the link can view".</li>
                <li><strong>Option B (service account):</strong> create a service account + JSON key → set env <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> (entire JSON). Share each folder with the service-account email as Viewer.</li>
                <li>Redeploy after setting variables (Vercel → Settings → Environment Variables).</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {banner && (
        <div className={cx('mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm',
          banner.ok ? 'border-jade/30 bg-jade/10 text-jade' : 'border-crimson/30 bg-crimson/10 text-crimson')}>
          <Info size={16} className="mt-0.5 shrink-0" /> <span className="leading-relaxed">{banner.text}</span>
        </div>
      )}

      {/* Mappings table */}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-coal text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Mapping</th>
              <th className="px-4 py-3">Folder ID</th>
              <th className="px-4 py-3">Files</th>
              <th className="px-4 py-3">Staged</th>
              <th className="px-4 py-3">Last sync</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-panel">
            {mappings.map((m) => (
              <tr key={m.id} className={cx('transition-colors hover:bg-panel2/60', !m.enabled && 'opacity-55')}>
                <td className="px-4 py-3">
                  <button onClick={() => toggleEnabled(m)} title={m.enabled ? 'Disable' : 'Enable'}
                    className={cx('rounded-lg border p-1.5', m.enabled ? 'border-jade/40 text-jade' : 'border-line text-muted')}>
                    {m.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-silver">{m.name}</p>
                  {m.last_error && <p className="mt-0.5 max-w-[240px] truncate text-[11px] text-crimson" title={m.last_error}>{m.last_error}</p>}
                </td>
                <td className="px-4 py-3">
                  <a href={`https://drive.google.com/drive/folders/${m.folder_id}`} target="_blank" rel="noreferrer"
                    className="font-mono text-[11px] text-azure hover:underline" title={m.folder_id}>
                    {m.folder_id.slice(0, 10)}…
                  </a>
                </td>
                <td className="px-4 py-3 text-muted">{m.file_count}</td>
                <td className="px-4 py-3">
                  {m.staged_count > 0
                    ? <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold text-amber-300">{m.staged_count} to review</span>
                    : <span className="text-muted">—</span>}
                </td>
                <td className="px-4 py-3 text-[11px] text-muted">
                  {m.last_synced_at ? fmtDate(m.last_synced_at) : 'never'}
                  {m.last_status === 'ok' && <span className="ml-1.5 text-jade">✓</span>}
                  {m.last_status === 'error' && <span className="ml-1.5 text-crimson">✗</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => syncOne(m)} disabled={!!syncing[m.id] || !m.enabled}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gold/50 px-2.5 py-1.5 text-[11px] font-bold text-gold hover:bg-gold/10 disabled:opacity-40" title="Sync this folder">
                      {syncing[m.id] ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Sync
                    </button>
                    <button onClick={() => setReview(m)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-silver hover:border-gold/50" title="Review staged files">
                      <FolderOpen size={13} /> Review
                    </button>
                    <button onClick={() => { setAdding(false); setEditMap({ ...m }); }} className="rounded-lg border border-line p-1.5 text-muted hover:text-gold" title="Edit"><Pencil size={13} /></button>
                    <button onClick={() => removeMapping(m)} className="rounded-lg border border-line p-1.5 text-muted hover:text-crimson" title="Remove"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sync history */}
      <section className="mt-8 rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-4 font-display text-base font-bold">Sync history</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted">No syncs yet. Enable credentials and run a sync — results and errors are logged here with timestamps.</p>
        ) : (
          <ul className="divide-y divide-line">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-2.5 text-xs">
                <span className={cx('h-2 w-2 rounded-full', l.status === 'ok' ? 'bg-jade' : 'bg-crimson')} />
                <span className="font-semibold text-silver">{l.mapping_name}</span>
                {l.status === 'ok'
                  ? <span className="text-muted">{l.files_found} found • {l.files_new} new{l.files_missing ? ` • ${l.files_missing} missing (kept)` : ''}</span>
                  : <span className="max-w-[420px] truncate text-crimson" title={l.error || ''}>{l.error}</span>}
                <span className="ml-auto text-muted">{fmtDate(l.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mapping editor modal */}
      <AnimatePresence>
        {editMap && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm" onClick={() => setEditMap(null)} />
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-4 top-[12vh] z-50 mx-auto max-w-md rounded-2xl border border-line bg-coal p-6 sm:inset-x-0">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">{adding ? 'Add folder mapping' : 'Edit mapping'}</h2>
                <button onClick={() => setEditMap(null)} className="rounded-lg p-2 text-muted hover:bg-panel2" aria-label="Close"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                {adding && (
                  <Field label="Google Drive folder ID" hint="From the folder URL: drive.google.com/drive/folders/THIS_PART">
                    <input className={inputCls} value={editMap.folder_id || ''} placeholder="1bjK_WmDAmru477EucJKlt8jV7_hJxdBu"
                      onChange={(e) => setEditMap({ ...editMap, folder_id: e.target.value.trim() })} />
                  </Field>
                )}
                <Field label="Display name">
                  <input className={inputCls} value={editMap.name || ''} onChange={(e) => setEditMap({ ...editMap, name: e.target.value })} />
                </Field>
                <Field label="Note (optional)">
                  <textarea rows={2} className={inputCls} value={editMap.note || ''} onChange={(e) => setEditMap({ ...editMap, note: e.target.value })} />
                </Field>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3 text-sm text-silver">
                  <input type="checkbox" checked={editMap.enabled !== false} onChange={(e) => setEditMap({ ...editMap, enabled: e.target.checked })} className="h-4 w-4 accent-[#d8b45a]" />
                  Enabled (included in "Sync all")
                </label>
                <div className="flex justify-end gap-3 border-t border-line pt-4">
                  <button onClick={() => setEditMap(null)} className="rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-muted hover:text-silver">Cancel</button>
                  <button onClick={saveMapping} className="rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-ink hover:bg-gold-soft">
                    {adding ? 'Add mapping' : 'Save mapping'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {review && <ReviewModal mapping={review} onClose={() => { setReview(null); load(); }} />}
    </div>
  );
}

function ReviewModal({ mapping, onClose }: { mapping: Mapping; onClose: () => void }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: CreatedDraft[]; skipped: string[] } | null>(null);
  const [publishSel, setPublishSel] = useState<Set<number>>(new Set());
  const [published, setPublished] = useState<string[]>([]);

  useEffect(() => {
    apiFetch<DriveFile[]>(`/api/drive-mappings?action=files&mapping_id=${mapping.id}&status=staged`, { auth: true })
      .then((fs) => {
        setFiles(fs);
        setSelected(new Set(fs.filter((f) => f.importable).map((f) => f.id)));
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [mapping.id]);

  const groups = useMemo(() => {
    const g = new Map<string, DriveFile[]>();
    files.forEach((f) => {
      if (!g.has(f.parent_path)) g.set(f.parent_path, []);
      g.get(f.parent_path)!.push(f);
    });
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [files]);

  const importSelected = async () => {
    setBusy(true);
    try {
      const r = await apiFetch<{ created: CreatedDraft[]; skipped: string[] }>('/api/drive-mappings', {
        method: 'POST', auth: true,
        body: { action: 'import', file_ids: [...selected] },
      });
      setResult(r);
      setPublishSel(new Set(r.created.map((c) => c.id)));
      if (!r.created.length && !r.skipped.length) setResult({ created: [], skipped: ['Nothing imported'] });
    } catch (e: any) {
      setResult({ created: [], skipped: [e.message] });
    } finally {
      setBusy(false);
    }
  };

  const publishSelected = async () => {
    setBusy(true);
    try {
      const r = await apiFetch<{ published: { name: string }[] }>('/api/drive-mappings', {
        method: 'POST', auth: true, body: { action: 'publish', product_ids: [...publishSel] },
      });
      setPublished(r.published.map((p) => p.name));
    } catch (e: any) {
      setPublished([`Error: ${e.message}`]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        className="fixed inset-x-4 top-[4vh] bottom-[4vh] z-50 mx-auto max-w-2xl overflow-y-auto rounded-2xl border border-line bg-coal p-6 sm:inset-x-0"
        role="dialog" aria-label={`Review staged files for ${mapping.name}`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Review: {mapping.name}</h2>
            <p className="text-xs text-muted">{files.length} staged file(s) • audio and ZIP are importable • import groups files into one draft playlist per folder</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-panel2" aria-label="Close"><X size={18} /></button>
        </div>

        {loading ? <Loader /> : files.length === 0 && !result ? (
          <EmptyState title="No staged files" sub="Run a sync first — new files found in Drive appear here for review before anything becomes a product." />
        ) : result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-jade/30 bg-jade/10 p-4">
              <p className="text-sm font-bold text-jade">Import complete</p>
              <ul className="mt-2 space-y-1.5 text-xs text-silver">
                {result.created.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-jade" /> {c.name} — {c.files} file(s), created as <strong>draft</strong>
                  </li>
                ))}
                {result.skipped.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted"><X size={13} className="text-crimson" /> {s}</li>
                ))}
              </ul>
            </div>
            {result.created.length > 0 && (
              <div className="rounded-xl border border-line bg-panel p-4">
                <p className="text-sm font-bold text-silver">Publish selected drafts?</p>
                <p className="mt-1 text-[11px] text-muted">Drafts still need artwork, price and details in Products — publishing is always your explicit choice.</p>
                <div className="mt-3 space-y-1.5">
                  {result.created.map((c) => (
                    <label key={c.id} className="flex items-center gap-2.5 rounded-lg bg-ink px-3 py-2 text-sm text-silver">
                      <input type="checkbox" checked={publishSel.has(c.id)}
                        onChange={(e) => {
                          const next = new Set(publishSel);
                          e.target.checked ? next.add(c.id) : next.delete(c.id);
                          setPublishSel(next);
                        }} className="h-4 w-4 accent-[#d8b45a]" />
                      {c.name}
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={publishSelected} disabled={busy || !publishSel.size}
                    className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink hover:bg-gold-soft disabled:opacity-40">
                    <Import size={13} /> Publish selected
                  </button>
                  <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-muted hover:text-silver">Done</button>
                </div>
                {published.length > 0 && (
                  <p className="mt-3 text-xs text-jade">Published: {published.join(', ')}</p>
                )}
              </div>
            )}
            {result.created.length === 0 && (
              <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-muted hover:text-silver">Close</button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-muted">{selected.size} of {files.length} selected</p>
              <div className="flex gap-2">
                <button onClick={() => setSelected(new Set(files.filter((f) => f.importable).map((f) => f.id)))} className="text-[11px] font-semibold text-gold hover:underline">Select importable</button>
                <button onClick={() => setSelected(new Set())} className="text-[11px] font-semibold text-muted hover:underline">Clear</button>
              </div>
            </div>
            <div className="max-h-[46vh] space-y-4 overflow-y-auto pr-1">
              {groups.map(([path, fs]) => (
                <div key={path}>
                  <label className="mb-1.5 flex cursor-pointer items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gold">
                    <input type="checkbox"
                      checked={fs.every((f) => selected.has(f.id))}
                      onChange={(e) => {
                        const next = new Set(selected);
                        fs.forEach((f) => e.target.checked ? next.add(f.id) : next.delete(f.id));
                        setSelected(next);
                      }} className="h-3.5 w-3.5 accent-[#d8b45a]" />
                    <FolderOpen size={12} /> {path}
                  </label>
                  <ul className="space-y-1 pl-6">
                    {fs.map((f) => (
                      <li key={f.id} className={cx('flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-xs',
                        f.importable ? 'border-line bg-ink' : 'border-line/50 bg-ink/40 opacity-50')}>
                        <input type="checkbox" disabled={!f.importable} checked={selected.has(f.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            e.target.checked ? next.add(f.id) : next.delete(f.id);
                            setSelected(next);
                          }} className="h-3.5 w-3.5 accent-[#d8b45a]" />
                        {f.mime?.startsWith('audio/') ? <FileAudio size={13} className="shrink-0 text-gold" /> : <FileArchive size={13} className="shrink-0 text-muted" />}
                        <span className="min-w-0 flex-1 truncate text-silver" title={f.name}>{f.name}</span>
                        <span className="shrink-0 text-muted">{fmtSize(f.size_bytes)}</span>
                        <span className="hidden shrink-0 text-muted sm:inline">{f.modified_at ? new Date(f.modified_at).toLocaleDateString('en-IN') : '—'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-3 border-t border-line pt-4">
              <button onClick={onClose} className="rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-muted hover:text-silver">Cancel</button>
              <button onClick={importSelected} disabled={busy || !selected.size}
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-ink hover:bg-gold-soft disabled:opacity-40">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <FolderDown size={13} />}
                Import {selected.size} as drafts
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
