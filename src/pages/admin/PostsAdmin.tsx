import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Upload, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, uploadImage } from '../../lib/api';
import { AdminHeader, inputCls, Field } from './AdminLayout';
import { Loader, EmptyState, StatusPill } from '../../components/UI';
import { fmtDate } from '../../lib/utils';
import { useEsc } from '../../hooks/useEsc';
import type { Post } from '../Blog';

const EMPTY: Partial<Post> = { title: '', slug: '', excerpt: '', content: '', image_url: '', seo_title: '', seo_desc: '', status: 'draft' };

export default function PostsAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEsc(!!editing, () => setEditing(null));

  const load = async () => {
    setLoading(true);
    setPosts(await apiFetch<Post[]>('/api/posts?all=1', { auth: true }).catch(() => []));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      await apiFetch('/api/posts', { method: editing.id ? 'PUT' : 'POST', auth: true, body: editing });
      setEditing(null); load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const toggle = async (p: Post) => {
    await apiFetch('/api/posts', { method: 'PUT', auth: true, body: { ...p, status: p.status === 'published' ? 'draft' : 'published' } }).catch(() => {});
    load();
  };

  const remove = async (p: Post) => {
    if (!confirm(`Delete post "${p.title}" permanently?`)) return;
    await apiFetch('/api/posts', { method: 'DELETE', auth: true, body: { id: p.id } }).catch(() => {});
    load();
  };

  return (
    <div>
      <AdminHeader title="Blog" sub="Write and publish posts \u2014 drafts stay hidden until published."
        right={<button onClick={() => { setError(''); setEditing({ ...EMPTY }); }}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink hover:bg-gold-soft">
          <Plus size={14} /> New post
        </button>} />

      {loading ? <Loader /> : posts.length === 0 ? (
        <EmptyState title="No posts yet" sub="Create your first post \u2014 release notes, gig stories, production tips." />
      ) : (
        <div className="grid gap-3">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel p-3.5">
              {p.image_url
                ? <img src={p.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                : <span className="h-14 w-14 rounded-lg bg-panel2" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-silver">{p.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">/blog/{p.slug} \u2022 {fmtDate(p.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={p.status || 'draft'} />
                {p.status === 'published' && (
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" title="View post"
                    className="rounded-lg border border-line p-2 text-muted hover:border-azure/50 hover:text-azure">
                    <ExternalLink size={15} />
                  </a>
                )}
                <button onClick={() => toggle(p)} title={p.status === 'published' ? 'Unpublish' : 'Publish'}
                  className="rounded-lg border border-line p-2 text-muted hover:border-gold/50 hover:text-gold">
                  {p.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button onClick={() => { setError(''); setEditing({ ...p }); }} className="rounded-lg border border-line p-2 text-muted hover:border-gold/50 hover:text-gold" title="Edit">
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

      <AnimatePresence>
        {editing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm" onClick={() => setEditing(null)} />
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-4 top-[4vh] bottom-[4vh] z-50 mx-auto max-w-2xl overflow-y-auto rounded-2xl border border-line bg-coal p-6 sm:inset-x-0">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">{editing.id ? 'Edit post' : 'New post'}</h2>
                <button onClick={() => setEditing(null)} className="rounded-lg p-2 text-muted hover:bg-panel2" aria-label="Close"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <Field label="Title">
                  <input className={inputCls} value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </Field>
                <Field label="Excerpt" hint="Shown on cards and used as default description">
                  <textarea rows={2} className={inputCls} value={editing.excerpt || ''} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
                </Field>
                <Field label="Content">
                  <textarea rows={10} className={inputCls} value={editing.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                </Field>
                <Field label="Cover image">
                  <div className="flex items-center gap-3">
                    {editing.image_url && <img src={editing.image_url} alt="" className="h-16 w-24 rounded-lg border border-line object-cover" />}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
                      <Upload size={14} /> Upload
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          const { url } = await uploadImage('artwork', f, true);
                          if (url) setEditing((x) => x && { ...x, image_url: url });
                        }} />
                    </label>
                  </div>
                  <input className={`${inputCls} mt-2`} value={editing.image_url || ''} placeholder="or paste image URL"
                    onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="SEO title (optional)">
                    <input className={inputCls} value={editing.seo_title || ''} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} />
                  </Field>
                  <Field label="SEO description (optional)">
                    <input className={inputCls} value={editing.seo_desc || ''} onChange={(e) => setEditing({ ...editing, seo_desc: e.target.value })} />
                  </Field>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3 text-sm text-silver">
                  <input type="checkbox" checked={editing.status === 'published'}
                    onChange={(e) => setEditing({ ...editing, status: e.target.checked ? 'published' : 'draft' })}
                    className="h-4 w-4 accent-[#d8b45a]" />
                  Published (visible on /blog)
                </label>
                {error && <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-3.5 py-2.5 text-xs text-crimson">{error}</p>}
                <div className="flex justify-end gap-3 border-t border-line pt-4">
                  <button onClick={() => setEditing(null)} className="rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-muted hover:text-silver">Cancel</button>
                  <button onClick={save} disabled={saving} className="rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-ink hover:bg-gold-soft disabled:opacity-50">
                    {saving ? 'Saving\u2026' : 'Save post'}
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
