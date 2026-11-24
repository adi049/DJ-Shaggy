import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiFetch, uploadImage, storagePathFromUrl, deleteStorageObject } from '../../lib/api';
import type { GalleryImage } from '../../lib/types';
import { AdminHeader, inputCls } from './AdminLayout';
import { Loader, EmptyState } from '../../components/UI';
import { cx } from '../../lib/utils';

interface UploadTask { name: string; pct: number; done: boolean; error?: string }

export default function GalleryAdmin() {
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setItems(await apiFetch<GalleryImage[]>('/api/gallery?all=1', { auth: true }).catch(() => []));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const uploadFiles = async (files: FileList) => {
    const list = [...files];
    for (const file of list) {
      const task: UploadTask = { name: file.name, pct: 0, done: false };
      setTasks((t) => [...t, task]);
      try {
        const { url, path } = await uploadImage('gallery', file, true, (pct) => {
          setTasks((t) => t.map((x) => (x.name === file.name && !x.done ? { ...x, pct } : x)));
        });
        if (!url) throw new Error('Upload failed');
        await apiFetch('/api/gallery', {
          method: 'POST', auth: true,
          body: { title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), alt: file.name, image_url: url, sort_order: items.length + 1, published: true },
        });
        setTasks((t) => t.map((x) => (x.name === file.name ? { ...x, pct: 100, done: true } : x)));
        void path;
      } catch (e: any) {
        setTasks((t) => t.map((x) => (x.name === file.name ? { ...x, done: true, error: e.message } : x)));
      }
    }
    load();
    setTimeout(() => setTasks((t) => t.filter((x) => !x.done)), 4000);
  };

  const update = async (g: GalleryImage) => {
    await apiFetch('/api/gallery', { method: 'PUT', auth: true, body: g }).catch(() => {});
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const arr = [...items];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const reordered = arr.map((g, i) => ({ ...g, sort_order: i + 1 }));
    setItems(reordered);
    await Promise.all([update(reordered[idx]), update(reordered[j])]);
  };

  const remove = async (g: GalleryImage) => {
    if (!confirm(`Delete "${g.title || 'image'}"? The file is also removed from storage.`)) return;
    const sp = storagePathFromUrl(g.image_url);
    await apiFetch('/api/gallery', { method: 'DELETE', auth: true, body: { id: g.id, storage_path: sp?.bucket === 'media' ? sp.path : undefined } }).catch(() => {});
    if (sp && sp.bucket !== 'media') await deleteStorageObject(sp.bucket, sp.path).catch(() => {});
    load();
  };

  return (
    <div>
      <AdminHeader title="Gallery" sub="Photos shown in the homepage gallery section \u2014 upload many at once, reorder, publish or remove."
        right={<div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink hover:bg-gold-soft">
            <Upload size={14} /> Upload images
          </button>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ''; }} />
        </div>} />

      {tasks.length > 0 && (
        <div className="mb-5 space-y-2">
          {tasks.map((t) => (
            <div key={t.name} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-2.5">
              {t.done && !t.error ? <CheckCircle2 size={15} className="shrink-0 text-jade" /> : null}
              <span className="min-w-0 flex-1 truncate text-xs text-silver">{t.name}</span>
              {t.error ? <span className="text-[11px] text-crimson">{t.error}</span> : (
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-gold transition-all" style={{ width: `${t.pct}%` }} />
                </div>
              )}
              <span className="w-10 text-right text-[11px] text-muted">{t.error ? 'failed' : `${t.pct}%`}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? <Loader /> : items.length === 0 ? (
        <EmptyState title="Gallery is empty" sub="Upload photos of gigs, the booth and crowds \u2014 they appear in the homepage gallery section." />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((g, i) => (
            <div key={g.id} className={cx('overflow-hidden rounded-2xl border bg-panel', g.published ? 'border-line' : 'border-line/50 opacity-60')}>
              <div className="relative aspect-square bg-coal">
                <img src={g.image_url} alt={g.alt || g.title} className="h-full w-full object-cover" loading="lazy" />
                {!g.published && <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-muted">HIDDEN</span>}
              </div>
              <div className="space-y-2 p-3">
                <input
                  className={inputCls}
                  value={g.title}
                  placeholder="Caption"
                  onChange={(e) => setItems(items.map((x) => (x.id === g.id ? { ...x, title: e.target.value } : x)))}
                  onBlur={() => update(g)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 text-muted hover:text-gold disabled:opacity-20" aria-label="Move earlier"><ArrowUp size={14} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded p-1.5 text-muted hover:text-gold disabled:opacity-20" aria-label="Move later"><ArrowDown size={14} /></button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={async () => { const next = { ...g, published: !g.published }; setItems(items.map((x) => (x.id === g.id ? next : x))); await update(next); }}
                      className="rounded p-1.5 text-muted hover:text-gold" title={g.published ? 'Hide' : 'Publish'}>
                      {g.published ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => remove(g)} className="rounded p-1.5 text-muted hover:text-crimson" title="Delete image + file"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
