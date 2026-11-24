import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, RefreshCw, Upload, Eye, EyeOff, FolderOpen, ExternalLink, FileAudio, Unlink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, uploadImage, uploadContent, storagePathFromUrl, deleteStorageObject } from '../../lib/api';
import { useEsc } from '../../hooks/useEsc';
import type { Product, Genre, Collection } from '../../lib/types';
import { AdminHeader, inputCls, Field } from './AdminLayout';
import { Loader, EmptyState, StatusPill } from '../../components/UI';
import { inr, cx } from '../../lib/utils';

const EMPTY: Partial<Product> = {
  name: '', slug: '', description: '', price: 0, original_price: null, track_count: 0,
  tags: [], is_bestseller: false, is_featured: false, status: 'draft',
  artwork_url: '', preview_note: '320kbps MP3 • Mixed & mastered by DJ SHAGGY • Club-ready edits',
  genre_id: null, collection_id: null, collection_ids: [], delivery_link: '', drive_folder_url: '', drive_folder_id: '',
  preview_audio_url: '', sort_order: 0, is_available: true,
};

interface LinkedTrack { id: number; file_id: string; name: string; mime: string; size_bytes: number; modified_at: string | null; parent_path: string }

export default function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'published' | 'draft'>('all');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [audioPct, setAudioPct] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEsc(!!editing, () => setEditing(null));

  const load = async () => {
    setLoading(true);
    try {
      const [p, g, c] = await Promise.all([
        apiFetch<Product[]>('/api/products?admin=1', { auth: true }),
        apiFetch<Genre[]>('/api/genres?all=1', { auth: true }),
        apiFetch<Collection[]>('/api/collections?all=1', { auth: true }),
      ]);
      setProducts(p); setGenres(g); setCollections(c);
    } catch { /* toast omitted */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const shown = useMemo(
    () => (tab === 'all' ? products : products.filter((p) => p.status === tab)),
    [products, tab]
  );

  const [tracks, setTracks] = useState<LinkedTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [contentFiles, setContentFiles] = useState<{ name: string; size: number; path: string }[]>([]);
  const [contentPct, setContentPct] = useState(0);

  const loadContent = async (pid: number) => {
    setContentFiles(await apiFetch<{ name: string; size: number; path: string }[]>(`/api/stream?action=list&product=${pid}`, { auth: true }).catch(() => []));
  };

  const openEditor = (p?: Product) => {
    setError('');
    setEditing(p ? { ...p, collection_ids: p.collection_ids || (p.collection_id ? [p.collection_id] : []) } : { ...EMPTY });
    setTagsText((p?.tags || []).join(', '));
    setTracks([]);
    setContentFiles([]);
    if (p?.id) loadContent(p.id);
    if (p?.id && (p.drive_folder_id || p.drive_folder_url)) {
      setTracksLoading(true);
      apiFetch<LinkedTrack[]>(`/api/drive-mappings?action=tracks&product_id=${p.id}`, { auth: true })
        .then(setTracks).catch(() => setTracks([])).finally(() => setTracksLoading(false));
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) { setError('Name is required.'); return; }
    // Duplicate detection: warn before saving an identical name.
    const dupe = products.find((p) => p.id !== editing.id && p.name.trim().toLowerCase() === editing.name!.trim().toLowerCase());
    if (dupe && !confirm(`A product named "${dupe.name}" already exists (id ${dupe.id}). Save anyway?`)) return;
    setSaving(true); setError('');
    try {
      const cids = (editing.collection_ids || []).map(Number).filter(Boolean);
      const body = {
        ...editing,
        tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
        genre_id: editing.genre_id || null,
        collection_ids: cids,
        collection_id: cids[0] ?? null, // legacy single-collection compatibility
        original_price: editing.original_price || null,
      };
      if (editing.id) {
        await apiFetch('/api/products', { method: 'PUT', auth: true, body });
      } else {
        await apiFetch('/api/products', { method: 'POST', auth: true, body });
      }
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (p: Product) => {
    await apiFetch('/api/products', {
      method: 'PUT', auth: true,
      body: { ...p, status: p.status === 'published' ? 'draft' : 'published' },
    }).catch(() => {});
    load();
  };

  const toggleSel = (id: number) => {
    const next = new Set(selected);
    selected.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulk = async (action: 'publish' | 'unpublish' | 'delete') => {
    const targets = products.filter((p) => selected.has(p.id));
    if (!targets.length) return;
    if (action === 'delete' && !confirm(`Delete ${targets.length} product(s) permanently? Past orders keep their snapshots.`)) return;
    setBulkBusy(true);
    for (const p of targets) {
      try {
        if (action === 'delete') {
          await apiFetch('/api/products', { method: 'DELETE', auth: true, body: { id: p.id } });
        } else {
          await apiFetch('/api/products', { method: 'PUT', auth: true, body: { ...p, status: action === 'publish' ? 'published' : 'draft' } });
        }
      } catch { /* continue with the rest */ }
    }
    setBulkBusy(false);
    setSelected(new Set());
    load();
  };

  const remove = async (p: Product) => {
    const driveNote = p.drive_folder_id ? '\n\u2022 It is Drive-linked: staged track mappings will be unlinked, never deleted from Drive.' : '';
    if (!confirm(`Delete "${p.name}" permanently?\n\u2022 Past orders keep their purchase snapshots.${driveNote}`)) return;
    await apiFetch('/api/products', { method: 'DELETE', auth: true, body: { id: p.id } }).catch(() => {});
    load();
  };

  const uploadArt = async (file: File) => {
    const { url } = await uploadImage('artwork', file, true);
    if (url) setEditing((e) => (e ? { ...e, artwork_url: url } : e));
  };

  const removeArt = async () => {
    if (!editing?.artwork_url) return;
    const sp = storagePathFromUrl(editing.artwork_url);
    setEditing({ ...editing, artwork_url: '' });
    if (sp) await deleteStorageObject(sp.bucket, sp.path).catch(() => {});
  };

  const unlinkTrack = async (t: LinkedTrack) => {
    await apiFetch('/api/drive-mappings', { method: 'POST', auth: true, body: { action: 'unlink_file', id: t.id } }).catch(() => {});
    setTracks(tracks.filter((x) => x.id !== t.id));
  };

  return (
    <div>
      <AdminHeader
        title="Products / Playlists"
        sub="Create, edit, publish and manage every playlist in the store."
        right={
          <div className="flex gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => openEditor()} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink hover:bg-gold-soft">
              <Plus size={14} /> New product
            </button>
          </div>
        }
      />

      <div className="mb-5 flex gap-2">
        {(['all', 'published', 'draft'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cx('rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-all',
              tab === t ? 'border-gold bg-gold/12 text-gold' : 'border-line text-muted hover:text-silver')}>
            {t} ({t === 'all' ? products.length : products.filter((p) => p.status === t).length})
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-gold/8 px-4 py-3">
          <span className="text-xs font-bold text-gold">{selected.size} selected</span>
          <button onClick={() => bulk('publish')} disabled={bulkBusy} className="rounded-lg bg-jade px-3 py-1.5 text-[11px] font-bold text-ink disabled:opacity-40">Publish</button>
          <button onClick={() => bulk('unpublish')} disabled={bulkBusy} className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold text-muted hover:text-silver disabled:opacity-40">Unpublish</button>
          <button onClick={() => bulk('delete')} disabled={bulkBusy} className="rounded-lg border border-crimson/40 px-3 py-1.5 text-[11px] font-bold text-crimson hover:bg-crimson/10 disabled:opacity-40">Delete</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] font-semibold text-muted hover:text-silver">Clear</button>
        </div>
      )}

      {loading ? <Loader /> : shown.length === 0 ? (
        <EmptyState title="No products here" sub="Create one manually or import folders from Google Drive." />
      ) : (
        <div className="grid gap-3">
          {shown.map((p) => (
            <div key={p.id} className={cx('flex flex-wrap items-center gap-4 rounded-xl border bg-panel p-3.5', selected.has(p.id) ? 'border-gold/50' : 'border-line')}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)}
                className="h-4 w-4 shrink-0 accent-[#d8b45a]" aria-label={`Select ${p.name}`} />
              {p.artwork_url
                ? <img src={p.artwork_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                : <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-panel2 text-[10px] font-bold text-muted">NO ART</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-silver">{p.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {p.genres?.name || 'No genre'} • {p.track_count} tracks • {inr(p.price)}
                  {p.original_price ? ` (was ${inr(p.original_price)})` : ''}
                  {p.drive_folder_id ? ' • Drive-linked' : ''}
                  {p.is_available === false ? ' • UNAVAILABLE' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.is_bestseller && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">BEST</span>}
                {p.is_featured && <span className="rounded-full bg-azure/15 px-2 py-0.5 text-[10px] font-bold text-azure">FEAT</span>}
                <StatusPill status={p.status} />
                <button onClick={() => togglePublish(p)} title={p.status === 'published' ? 'Unpublish' : 'Publish'}
                  className="rounded-lg border border-line p-2 text-muted hover:border-gold/50 hover:text-gold">
                  {p.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                {p.status === 'published' && (
                  <a href={`/playlist/${p.slug}`} target="_blank" rel="noreferrer" title="Preview in store"
                    className="rounded-lg border border-line p-2 text-muted hover:border-azure/50 hover:text-azure">
                    <ExternalLink size={15} />
                  </a>
                )}
                <button onClick={() => openEditor(p)} className="rounded-lg border border-line p-2 text-muted hover:border-gold/50 hover:text-gold" title="Edit">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(p)} className="rounded-lg border border-line p-2 text-muted hover:border-crimson/50 hover:text-crimson" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm" onClick={() => setEditing(null)} />
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-4 top-[4vh] bottom-[4vh] z-50 mx-auto max-w-2xl overflow-y-auto rounded-2xl border border-line bg-coal p-6 sm:inset-x-0"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">{editing.id ? `Edit: ${editing.name}` : 'New product'}</h2>
                <button onClick={() => setEditing(null)} className="rounded-lg p-2 text-muted hover:bg-panel2" aria-label="Close"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <Field label="Name">
                  <input className={inputCls} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Price (₹)">
                    <input type="number" min={0} className={inputCls} value={editing.price ?? 0}
                      onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                  </Field>
                  <Field label="Original price (₹, optional)" hint="Shows as strikethrough + discount badge">
                    <input type="number" min={0} className={inputCls} value={editing.original_price ?? ''}
                      onChange={(e) => setEditing({ ...editing, original_price: e.target.value ? Number(e.target.value) : null })} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Genre">
                    <select className={inputCls} value={editing.genre_id ?? ''}
                      onChange={(e) => setEditing({ ...editing, genre_id: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">— None —</option>
                      {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Track count">
                    <input type="number" min={0} className={inputCls} value={editing.track_count ?? 0}
                      onChange={(e) => setEditing({ ...editing, track_count: Number(e.target.value) })} />
                  </Field>
                </div>
                <Field label="Collections" hint="A playlist can belong to multiple collections">
                  <div className="flex flex-wrap gap-2">
                    {collections.map((c) => {
                      const on = (editing.collection_ids || []).includes(c.id);
                      return (
                        <button key={c.id} type="button"
                          onClick={() => {
                            const cur = new Set(editing.collection_ids || []);
                            on ? cur.delete(c.id) : cur.add(c.id);
                            setEditing({ ...editing, collection_ids: [...cur] });
                          }}
                          className={cx('rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                            on ? 'border-gold bg-gold/12 text-gold' : 'border-line text-muted hover:border-gold/40 hover:text-silver')}>
                          {c.name}
                        </button>
                      );
                    })}
                    {!collections.length && <span className="text-xs text-muted">No collections yet</span>}
                  </div>
                </Field>
                <Field label="Description">
                  <textarea rows={4} className={inputCls} value={editing.description || ''}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </Field>
                <Field label="Preview / what's included note">
                  <textarea rows={2} className={inputCls} value={editing.preview_note || ''}
                    onChange={(e) => setEditing({ ...editing, preview_note: e.target.value })} />
                </Field>
                <Field label="Tags (comma separated)" hint="Used by search and the chat assistant">
                  <input className={inputCls} value={tagsText} onChange={(e) => setTagsText(e.target.value)}
                    placeholder="bollywood, remix, wedding" />
                </Field>

                <Field label="Preview audio (optional)" hint="MP3/WAV/M4A, max 15 MB • shown as a player on the playlist page">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
                      <Upload size={14} /> {audioPct > 0 && audioPct < 100 ? `Uploading ${audioPct}%` : 'Upload audio'}
                      <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a" className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setAudioPct(1);
                          try {
                            const { url } = await uploadImage('audio', f, true, setAudioPct);
                            if (url) setEditing((x) => x && { ...x, preview_audio_url: url });
                          } catch (err: any) { setError(err.message); }
                          setAudioPct(0);
                        }} />
                    </label>
                    {editing.preview_audio_url && (
                      <button type="button" onClick={() => setEditing({ ...editing, preview_audio_url: '' })}
                        className="text-xs text-crimson hover:underline">Remove audio</button>
                    )}
                  </div>
                  {audioPct > 0 && audioPct < 100 && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div className="h-full bg-gold transition-all" style={{ width: `${audioPct}%` }} />
                    </div>
                  )}
                  {editing.preview_audio_url && <audio controls preload="none" src={editing.preview_audio_url} className="mt-2 h-9 w-full" />}
                </Field>

                <Field label="Display order" hint="Lower numbers appear first in the catalogue's default sort">
                  <input type="number" className={inputCls} value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </Field>

                <Field label="Artwork">
                  <div className="flex items-center gap-4">
                    {editing.artwork_url
                      ? <img src={editing.artwork_url} alt="" className="h-20 w-20 rounded-lg border border-line object-cover" />
                      : <span className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-line text-[10px] text-muted">No image</span>}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
                      <Upload size={14} /> {editing.artwork_url ? 'Replace' : 'Upload image'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadArt(e.target.files[0])} />
                    </label>
                    {editing.artwork_url && (
                      <button type="button" onClick={removeArt}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-crimson/40 px-3 py-2 text-xs font-semibold text-crimson hover:bg-crimson/10">
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>
                  <input className={`${inputCls} mt-2`} value={editing.artwork_url || ''} placeholder="or paste image URL"
                    onChange={(e) => setEditing({ ...editing, artwork_url: e.target.value })} />
                </Field>

                <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
                  <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gold">
                    <FolderOpen size={13} /> Delivery resource (private)
                  </p>
                  <Field label="Delivery link (Google Drive folder/file URL)" hint="Only emailed to the customer after you approve payment. Never shown publicly.">
                    <input className={inputCls} value={editing.delivery_link || ''}
                      onChange={(e) => setEditing({ ...editing, delivery_link: e.target.value })}
                      placeholder="https://drive.google.com/drive/folders/…" />
                  </Field>
                  {editing.drive_folder_url && (
                    <p className="mt-2 text-[11px] text-muted">
                      Linked via Drive import: <span className="font-mono text-silver/80">{editing.drive_folder_url}</span>
                      {' '}(used automatically if no delivery link is set)
                    </p>
                  )}
                </div>

                {/* Protected content files (private bucket, expiring links) */}
                {editing.id && (
                  <div className="rounded-xl border border-azure/25 bg-azure/5 p-4">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-azure">
                      <Upload size={13} /> Protected content files ({contentFiles.length})
                    </p>
                    <p className="mb-3 text-[11px] leading-relaxed text-muted">
                      Private storage \u2014 customers get 120-second expiring links after verification, never a public URL.
                      Full packs belong in Drive (3 MB server limit here).
                    </p>
                    {!!contentFiles.length && (
                      <ul className="mb-3 space-y-1">
                        {contentFiles.map((f) => (
                          <li key={f.path} className="flex items-center gap-2.5 rounded-lg bg-ink px-3 py-2 text-xs">
                            <span className="min-w-0 flex-1 truncate text-silver">{f.name}</span>
                            <span className="text-muted">{(f.size / 1048576).toFixed(1)} MB</span>
                            <button type="button" title="Delete file"
                              onClick={async () => {
                                if (!confirm(`Delete ${f.name} from protected storage?`)) return;
                                await deleteStorageObject('content', f.path).catch(() => {});
                                loadContent(editing.id!);
                              }}
                              className="rounded p-1 text-muted hover:text-crimson"><Trash2 size={13} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-azure/50">
                      <Upload size={14} /> {contentPct > 0 && contentPct < 100 ? `Uploading ${contentPct}%` : 'Upload file'}
                      <input type="file" accept="audio/*,.zip,image/*" className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setContentPct(1);
                          try {
                            await uploadContent(editing.id!, f, setContentPct);
                            await loadContent(editing.id!);
                          } catch (err: any) { setError(err.message); }
                          setContentPct(0);
                          e.target.value = '';
                        }} />
                    </label>
                  </div>
                )}

                {/* Linked Drive tracks */}
                {editing.id && (editing.drive_folder_id || editing.drive_folder_url) && (
                  <div className="rounded-xl border border-line bg-panel/60 p-4">
                    <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gold">
                      <FileAudio size={13} /> Linked Drive tracks {tracks.length > 0 && `(${tracks.length})`}
                    </p>
                    {tracksLoading ? (
                      <p className="text-xs text-muted">Loading track mappings…</p>
                    ) : tracks.length === 0 ? (
                      <p className="text-xs text-muted">No individual files linked. Sync the folder in Drive Manager to stage its tracks here.</p>
                    ) : (
                      <ul className="max-h-52 space-y-1 overflow-y-auto pr-1">
                        {tracks.map((t) => (
                          <li key={t.id} className="flex items-center gap-2.5 rounded-lg bg-ink px-3 py-2 text-xs">
                            <FileAudio size={13} className="shrink-0 text-gold" />
                            <span className="min-w-0 flex-1 truncate text-silver" title={t.name}>{t.name}</span>
                            <span className="shrink-0 text-muted">{t.size_bytes ? `${(t.size_bytes / 1048576).toFixed(1)} MB` : '—'}</span>
                            <button type="button" onClick={() => unlinkTrack(t)} title="Unlink from product (returns to staged review)"
                              className="shrink-0 rounded p-1 text-muted hover:text-orange-300">
                              <Unlink size={13} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3 text-sm text-silver">
                    <input type="checkbox" checked={!!editing.is_bestseller}
                      onChange={(e) => setEditing({ ...editing, is_bestseller: e.target.checked })}
                      className="h-4 w-4 accent-[#d8b45a]" />
                    Bestseller
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3 text-sm text-silver">
                    <input type="checkbox" checked={!!editing.is_featured}
                      onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
                      className="h-4 w-4 accent-[#d8b45a]" />
                    Featured
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3 text-sm text-silver">
                    <input type="checkbox" checked={editing.status === 'published'}
                      onChange={(e) => setEditing({ ...editing, status: e.target.checked ? 'published' : 'draft' })}
                      className="h-4 w-4 accent-[#d8b45a]" />
                    Published (live)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3 text-sm text-silver sm:col-span-3">
                    <input type="checkbox" checked={editing.is_available !== false}
                      onChange={(e) => setEditing({ ...editing, is_available: e.target.checked })}
                      className="h-4 w-4 accent-[#d8b45a]" />
                    Available for purchase (uncheck to hide from the store without unpublishing)
                  </label>
                </div>

                {error && <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-3.5 py-2.5 text-xs text-crimson">{error}</p>}

                <div className="flex justify-end gap-3 border-t border-line pt-4">
                  <button onClick={() => setEditing(null)} className="rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-muted hover:text-silver">
                    Cancel
                  </button>
                  <button onClick={save} disabled={saving}
                    className="rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-ink hover:bg-gold-soft disabled:opacity-50">
                    {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create product'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
