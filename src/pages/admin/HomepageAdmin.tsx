import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, X, Eye, EyeOff, ArrowUp, ArrowDown, Upload, RefreshCw, ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, uploadImage, storagePathFromUrl, deleteStorageObject } from '../../lib/api';
import type { HomeSection, Banner } from '../../lib/types';
import { AdminHeader, inputCls, Field } from './AdminLayout';
import { useEsc } from '../../hooks/useEsc';
import { Loader, EmptyState } from '../../components/UI';
import { cx } from '../../lib/utils';

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero (headline, buttons)',
  collections: 'Featured collections',
  bestsellers: 'Best-selling playlists',
  genres: 'Browse by genre',
  bundles: 'Bundles',
  featured: 'Featured products',
  gallery: 'Gallery',
  about: 'About DJ SHAGGY',
  how: 'How ordering works',
  faq: 'FAQ preview',
  cta: 'Support call-to-action',
};

export default function HomepageAdmin() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSec, setEditSec] = useState<HomeSection | null>(null);
  const [editBan, setEditBan] = useState<Partial<Banner> | null>(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const hp = await apiFetch<{ sections: HomeSection[]; banners: Banner[] }>('/api/homepage?all=1', { auth: true }).catch(() => ({ sections: [], banners: [] }));
    setSections(hp.sections.sort((a, b) => a.sort_order - b.sort_order));
    setBanners(hp.banners.sort((a, b) => a.sort_order - b.sort_order));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveSection = async (s: HomeSection) => {
    await apiFetch('/api/homepage', { method: 'PUT', auth: true, body: { type: 'section', ...s } }).catch(() => {});
  };

  const toggleSection = async (s: HomeSection) => {
    const next = { ...s, visible: !s.visible };
    setSections(sections.map((x) => (x.id === s.id ? next : x)));
    await saveSection(next);
  };

  const moveSection = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= sections.length) return;
    const arr = [...sections];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const reordered = arr.map((s, i) => ({ ...s, sort_order: i + 1 }));
    setSections(reordered);
    await Promise.all([saveSection(reordered[idx]), saveSection(reordered[j])]);
  };

  const saveBanner = async () => {
    if (!editBan) return;
    if (!editBan.image_url) { setError('Banner image is required.'); return; }
    setSaving(true); setError('');
    try {
      await apiFetch('/api/homepage', {
        method: editBan.id ? 'PUT' : 'POST', auth: true,
        body: { type: 'banner', ...editBan },
      });
      setEditBan(null); load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const moveBanner = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= banners.length) return;
    const arr = [...banners];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const reordered = arr.map((b, i) => ({ ...b, sort_order: i + 1 }));
    setBanners(reordered);
    await Promise.all([
      apiFetch('/api/homepage', { method: 'PUT', auth: true, body: { type: 'banner', ...reordered[idx] } }),
      apiFetch('/api/homepage', { method: 'PUT', auth: true, body: { type: 'banner', ...reordered[j] } }),
    ]);
  };

  const deleteBanner = async (b: Banner) => {
    if (!confirm(`Delete banner "${b.title || b.id}"?`)) return;
    await apiFetch('/api/homepage', { method: 'DELETE', auth: true, body: { type: 'banner', id: b.id } }).catch(() => {});
    const sp = b.image_url ? storagePathFromUrl(b.image_url) : null;
    if (sp) await deleteStorageObject(sp.bucket, sp.path).catch(() => {});
    load();
  };

  if (loading) return <Loader />;

  return (
    <div>
      <AdminHeader title="Homepage" sub="Control hero content, section order & visibility, and rotating promo banners."
        right={<button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
          <RefreshCw size={14} /> Refresh
        </button>} />

      {/* Sections */}
      <section className="mb-10 rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-1 font-display text-base font-bold">Sections</h2>
        <p className="mb-4 text-xs text-muted">Reorder with arrows, toggle visibility, edit titles/subtitles and hero buttons. Changes go live immediately.</p>
        <div className="space-y-2">
          {sections.map((s, i) => (
            <div key={s.id} className={cx('flex items-center gap-3 rounded-xl border px-3.5 py-3',
              s.visible ? 'border-line bg-ink' : 'border-line/50 bg-ink/40 opacity-60')}>
              <div className="flex flex-col">
                <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="text-muted hover:text-gold disabled:opacity-20" aria-label="Move up"><ArrowUp size={13} /></button>
                <button onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1} className="text-muted hover:text-gold disabled:opacity-20" aria-label="Move down"><ArrowDown size={13} /></button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-silver">{SECTION_LABELS[s.key] || s.key}</p>
                {s.title && <p className="truncate text-[11px] text-muted">{s.title}</p>}
              </div>
              <button onClick={() => toggleSection(s)} title={s.visible ? 'Hide section' : 'Show section'}
                className={cx('rounded-lg border p-2', s.visible ? 'border-jade/40 text-jade' : 'border-line text-muted')}>
                {s.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button onClick={() => { setError(''); setEditSec({ ...s, config: { ...(s.config || {}) } }); }}
                className="rounded-lg border border-line p-2 text-muted hover:border-gold/50 hover:text-gold" title="Edit section">
                <Pencil size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Banners */}
      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Promotional banners</h2>
          <button onClick={() => { setError(''); setProgress(0); setEditBan({ title: '', subtitle: '', image_url: '', cta_label: '', cta_link: '', active: true }); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-2 text-[11px] font-bold text-ink hover:bg-gold-soft">
            <Plus size={13} /> Add banner
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">Active banners rotate as the homepage hero background and promo chip (6s crossfade). First banner shows first.</p>
        {banners.length === 0 ? (
          <EmptyState title="No banners yet" sub="Add one to promote a bundle, drop or offer in the hero." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {banners.map((b, i) => (
              <div key={b.id} className={cx('overflow-hidden rounded-xl border', b.active ? 'border-line' : 'border-line/50 opacity-60')}>
                <div className="relative h-32 bg-coal">
                  {b.image_url && <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                  <span className={cx('absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold',
                    b.active ? 'bg-jade/20 text-jade' : 'bg-panel2 text-muted')}>{b.active ? 'ACTIVE' : 'HIDDEN'}</span>
                  <p className="absolute bottom-2.5 left-3 right-3 truncate text-sm font-bold text-white">{b.title || '(no title)'}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-ink px-2.5 py-2">
                  <button onClick={() => moveBanner(i, -1)} disabled={i === 0} className="rounded p-1.5 text-muted hover:text-gold disabled:opacity-20" aria-label="Move up"><ArrowUp size={14} /></button>
                  <button onClick={() => moveBanner(i, 1)} disabled={i === banners.length - 1} className="rounded p-1.5 text-muted hover:text-gold disabled:opacity-20" aria-label="Move down"><ArrowDown size={14} /></button>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted">{b.cta_link || 'no link'}</span>
                  <button onClick={async () => { await apiFetch('/api/homepage', { method: 'PUT', auth: true, body: { type: 'banner', ...b, active: !b.active } }); load(); }}
                    className="rounded p-1.5 text-muted hover:text-gold" title={b.active ? 'Deactivate' : 'Activate'}>
                    {b.active ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => { setError(''); setProgress(0); setEditBan({ ...b }); }} className="rounded p-1.5 text-muted hover:text-gold" title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => deleteBanner(b)} className="rounded p-1.5 text-muted hover:text-crimson" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section editor */}
      <AnimatePresence>
        {editSec && (
          <Modal onClose={() => setEditSec(null)} title={`Edit section: ${SECTION_LABELS[editSec.key] || editSec.key}`}>
            <div className="space-y-4">
              {editSec.key !== 'hero' && (
                <>
                  <Field label="Section title">
                    <input className={inputCls} value={editSec.title} onChange={(e) => setEditSec({ ...editSec, title: e.target.value })} />
                  </Field>
                  <Field label="Section subtitle">
                    <textarea rows={2} className={inputCls} value={editSec.subtitle} onChange={(e) => setEditSec({ ...editSec, subtitle: e.target.value })} />
                  </Field>
                </>
              )}
              {editSec.key === 'hero' && (
                <>
                  <Field label="Hero heading" hint="Text before the first comma renders in gold">
                    <input className={inputCls} value={editSec.title} onChange={(e) => setEditSec({ ...editSec, title: e.target.value })} placeholder="Club-Ready Playlists, Curated by DJ SHAGGY" />
                  </Field>
                  <Field label="Hero subtitle">
                    <textarea rows={2} className={inputCls} value={editSec.subtitle} onChange={(e) => setEditSec({ ...editSec, subtitle: e.target.value })} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Button 1 label">
                      <input className={inputCls} value={editSec.config?.cta1_label || ''} onChange={(e) => setEditSec({ ...editSec, config: { ...editSec.config, cta1_label: e.target.value } })} />
                    </Field>
                    <Field label="Button 1 link">
                      <input className={inputCls} value={editSec.config?.cta1_link || ''} onChange={(e) => setEditSec({ ...editSec, config: { ...editSec.config, cta1_link: e.target.value } })} placeholder="/catalogue" />
                    </Field>
                    <Field label="Button 2 label">
                      <input className={inputCls} value={editSec.config?.cta2_label || ''} onChange={(e) => setEditSec({ ...editSec, config: { ...editSec.config, cta2_label: e.target.value } })} />
                    </Field>
                    <Field label="Button 2 link">
                      <input className={inputCls} value={editSec.config?.cta2_link || ''} onChange={(e) => setEditSec({ ...editSec, config: { ...editSec.config, cta2_link: e.target.value } })} placeholder="/best-sellers" />
                    </Field>
                  </div>
                </>
              )}
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3 text-sm text-silver">
                <input type="checkbox" checked={editSec.visible} onChange={(e) => setEditSec({ ...editSec, visible: e.target.checked })} className="h-4 w-4 accent-[#d8b45a]" />
                Visible on homepage
              </label>
              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <button onClick={() => setEditSec(null)} className="rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-muted hover:text-silver">Cancel</button>
                <button onClick={async () => { await saveSection(editSec); setEditSec(null); load(); }}
                  className="rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-ink hover:bg-gold-soft">Save section</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Banner editor */}
      <AnimatePresence>
        {editBan && (
          <Modal onClose={() => setEditBan(null)} title={editBan.id ? 'Edit banner' : 'New banner'}>
            <div className="space-y-4">
              <Field label="Banner image">
                <div className="flex items-start gap-4">
                  {editBan.image_url
                    ? <img src={editBan.image_url} alt="Banner preview" className="h-24 w-40 rounded-lg border border-line object-cover" />
                    : <span className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-line text-muted"><ImageIcon size={20} /></span>}
                  <div className="flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
                      <Upload size={14} /> {progress > 0 && progress < 100 ? `Uploading ${progress}%` : 'Upload image'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setProgress(1);
                          try {
                            const { url } = await uploadImage('banner', f, true, setProgress);
                            if (url) setEditBan((x) => x && { ...x, image_url: url });
                          } catch (err: any) { setError(err.message); }
                          setProgress(0);
                        }} />
                    </label>
                    {progress > 0 && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                        <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                    <input className={`${inputCls} mt-2`} value={editBan.image_url || ''} placeholder="or paste image URL"
                      onChange={(e) => setEditBan({ ...editBan, image_url: e.target.value })} />
                  </div>
                </div>
              </Field>
              <Field label="Promo text (shown as the hero chip)">
                <input className={inputCls} value={editBan.title || ''} onChange={(e) => setEditBan({ ...editBan, title: e.target.value })} placeholder="Wedding Mega Bundle — save 33%" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Link destination">
                  <input className={inputCls} value={editBan.cta_link || ''} onChange={(e) => setEditBan({ ...editBan, cta_link: e.target.value })} placeholder="/bundles" />
                </Field>
                <Field label="CTA label (optional)">
                  <input className={inputCls} value={editBan.cta_label || ''} onChange={(e) => setEditBan({ ...editBan, cta_label: e.target.value })} placeholder="View bundle" />
                </Field>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3 text-sm text-silver">
                <input type="checkbox" checked={editBan.active !== false} onChange={(e) => setEditBan({ ...editBan, active: e.target.checked })} className="h-4 w-4 accent-[#d8b45a]" />
                Active (included in rotation)
              </label>
              {error && <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-3.5 py-2.5 text-xs text-crimson">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <button onClick={() => setEditBan(null)} className="rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-muted hover:text-silver">Cancel</button>
                <button onClick={saveBanner} disabled={saving}
                  className="rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-ink hover:bg-gold-soft disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save banner'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  useEsc(true, onClose);
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        className="fixed inset-x-4 top-[6vh] bottom-[6vh] z-50 mx-auto max-w-xl overflow-y-auto rounded-2xl border border-line bg-coal p-6 sm:inset-x-0"
        role="dialog" aria-label={title}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-panel2" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </>
  );
}
