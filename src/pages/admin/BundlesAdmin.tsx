import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, uploadImage } from '../../lib/api';
import type { Bundle, Product } from '../../lib/types';
import { AdminHeader, inputCls, Field } from './AdminLayout';
import { Loader, EmptyState, StatusPill } from '../../components/UI';
import { inr, cx } from '../../lib/utils';

const EMPTY: Partial<Bundle> = {
  name: '', description: '', price: 0, original_price: null, artwork_url: '', product_ids: [], status: 'draft',
};

export default function BundlesAdmin() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Bundle> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [b, p] = await Promise.all([
      apiFetch<Bundle[]>('/api/bundles?all=1', { auth: true }).catch(() => []),
      apiFetch<Product[]>('/api/products?admin=1', { auth: true }).catch(() => []),
    ]);
    setBundles(b); setProducts(p.filter((x) => x.status === 'published'));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) { setError('Name is required.'); return; }
    if (!editing.product_ids?.length) { setError('Select at least one product.'); return; }
    setSaving(true); setError('');
    try {
      await apiFetch('/api/bundles', { method: editing.id ? 'PUT' : 'POST', auth: true, body: editing });
      setEditing(null); load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (b: Bundle) => {
    if (!confirm(`Delete bundle "${b.name}"?`)) return;
    await apiFetch('/api/bundles', { method: 'DELETE', auth: true, body: { id: b.id } }).catch(() => {});
    load();
  };

  const worth = (b: Partial<Bundle>) =>
    (b.product_ids || []).reduce((s, id) => s + (products.find((p) => p.id === id)?.price || 0), 0);

  return (
    <div>
      <AdminHeader title="Bundles" sub="Combine playlists into discounted packages."
        right={<button onClick={() => { setError(''); setEditing({ ...EMPTY }); }}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink hover:bg-gold-soft">
          <Plus size={14} /> New bundle
        </button>} />

      {loading ? <Loader /> : bundles.length === 0 ? (
        <EmptyState title="No bundles yet" sub="Create one to package multiple playlists at a lower price." />
      ) : (
        <div className="grid gap-3">
          {bundles.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel p-3.5">
              {b.artwork_url
                ? <img src={b.artwork_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                : <span className="h-14 w-14 rounded-lg bg-panel2" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-silver">{b.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {(b.product_ids || []).length} playlists • {inr(b.price)}
                  {b.original_price ? ` (was ${inr(b.original_price)})` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={b.status} />
                <button onClick={() => { setError(''); setEditing({ ...b }); }} className="rounded-lg border border-line p-2 text-muted hover:border-gold/50 hover:text-gold" title="Edit">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(b)} className="rounded-lg border border-line p-2 text-muted hover:border-crimson/50 hover:text-crimson" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm" onClick={() => setEditing(null)} />
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-4 top-[5vh] bottom-[5vh] z-50 mx-auto max-w-xl overflow-y-auto rounded-2xl border border-line bg-coal p-6 sm:inset-x-0">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">{editing.id ? 'Edit bundle' : 'New bundle'}</h2>
                <button onClick={() => setEditing(null)} className="rounded-lg p-2 text-muted hover:bg-panel2" aria-label="Close"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <Field label="Name">
                  <input className={inputCls} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </Field>
                <Field label="Description">
                  <textarea rows={3} className={inputCls} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Bundle price (₹)">
                    <input type="number" min={0} className={inputCls} value={editing.price ?? 0}
                      onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                  </Field>
                  <Field label="Original price (₹)" hint={`Included items are worth ${inr(worth(editing))} separately`}>
                    <input type="number" min={0} className={inputCls} value={editing.original_price ?? ''}
                      onChange={(e) => setEditing({ ...editing, original_price: e.target.value ? Number(e.target.value) : null })} />
                  </Field>
                </div>
                <Field label="Artwork">
                  <div className="flex items-center gap-3">
                    {editing.artwork_url && <img src={editing.artwork_url} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" />}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
                      <Upload size={14} /> Upload
                      <input type="file" accept="image/*" className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          const { url } = await uploadImage('artwork', f, true);
                          if (url) setEditing((x) => x && { ...x, artwork_url: url });
                        }} />
                    </label>
                  </div>
                  <input className={`${inputCls} mt-2`} value={editing.artwork_url || ''} placeholder="or paste image URL"
                    onChange={(e) => setEditing({ ...editing, artwork_url: e.target.value })} />
                </Field>
                <Field label="Included playlists">
                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-line bg-ink p-2.5">
                    {products.map((p) => (
                      <label key={p.id} className={cx('flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
                        editing.product_ids?.includes(p.id) ? 'bg-gold/10 text-gold-soft' : 'text-silver/80 hover:bg-panel2')}>
                        <input type="checkbox" className="h-4 w-4 accent-[#d8b45a]"
                          checked={!!editing.product_ids?.includes(p.id)}
                          onChange={(e) => {
                            const ids = new Set(editing.product_ids || []);
                            e.target.checked ? ids.add(p.id) : ids.delete(p.id);
                            setEditing({ ...editing, product_ids: [...ids] });
                          }} />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-[11px] text-muted">{inr(p.price)}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3 text-sm text-silver">
                  <input type="checkbox" checked={editing.status === 'published'}
                    onChange={(e) => setEditing({ ...editing, status: e.target.checked ? 'published' : 'draft' })}
                    className="h-4 w-4 accent-[#d8b45a]" />
                  Published (live in store)
                </label>
                {error && <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-3.5 py-2.5 text-xs text-crimson">{error}</p>}
                <div className="flex justify-end gap-3 border-t border-line pt-4">
                  <button onClick={() => setEditing(null)} className="rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-muted hover:text-silver">Cancel</button>
                  <button onClick={save} disabled={saving} className="rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-ink hover:bg-gold-soft disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save bundle'}
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
