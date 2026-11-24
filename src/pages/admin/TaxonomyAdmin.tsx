import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Upload, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { apiFetch, uploadImage } from '../../lib/api';
import type { Genre, Collection } from '../../lib/types';
import { AdminHeader, inputCls } from './AdminLayout';
import { Loader } from '../../components/UI';

const ACCENT_CHOICES = ['#f34fd0', '#2fd27d', '#4f8cff', '#ff3b4e', '#d8b45a', '#22d3ee', '#a78bfa', '#fb923c'];

export default function TaxonomyAdmin() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [g, c] = await Promise.all([
      apiFetch<Genre[]>('/api/genres?all=1', { auth: true }).catch(() => []),
      apiFetch<Collection[]>('/api/collections?all=1', { auth: true }).catch(() => []),
    ]);
    setGenres(g); setCollections(c); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <Loader />;

  return (
    <div>
      <AdminHeader title="Genres & Collections" sub="Organise the catalogue — changes go live immediately when published." />
      <div className="grid gap-8 lg:grid-cols-2">
        <GenrePanel genres={genres} reload={load} />
        <CollectionPanel collections={collections} reload={load} />
      </div>
    </div>
  );
}

function GenrePanel({ genres, reload }: { genres: Genre[]; reload: () => void }) {
  const blank = { name: '', description: '', accent: '#d8b45a', published: true };
  const [drafts, setDrafts] = useState<Record<number, Partial<Genre>>>({});
  const [adding, setAdding] = useState<typeof blank | null>(null);

  const save = async (g: Partial<Genre>) => {
    await apiFetch('/api/genres', { method: g.id ? 'PUT' : 'POST', auth: true, body: { ...genres.find((x) => x.id === g.id), ...g } }).catch(() => {});
    setAdding(null); setDrafts({}); reload();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= genres.length) return;
    const a = genres[idx], b = genres[j];
    await Promise.all([
      apiFetch('/api/genres', { method: 'PUT', auth: true, body: { ...a, sort_order: b.sort_order } }),
      apiFetch('/api/genres', { method: 'PUT', auth: true, body: { ...b, sort_order: a.sort_order } }),
    ]);
    reload();
  };

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-bold">Genres</h2>
        <button onClick={() => setAdding(blank)} className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-[11px] font-bold text-ink">
          <Plus size={13} /> Add genre
        </button>
      </div>
      <div className="space-y-3">
        {genres.map((g) => {
          const d = drafts[g.id] ?? g;
          return (
            <div key={g.id} className="rounded-xl border border-line bg-ink p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex flex-col">
                  <button onClick={() => move(genres.indexOf(g), -1)} disabled={genres.indexOf(g) === 0} className="text-muted hover:text-gold disabled:opacity-20" aria-label="Move up"><ArrowUp size={12} /></button>
                  <button onClick={() => move(genres.indexOf(g), 1)} disabled={genres.indexOf(g) === genres.length - 1} className="text-muted hover:text-gold disabled:opacity-20" aria-label="Move down"><ArrowDown size={12} /></button>
                </span>
                <input type="color" value={d.accent || '#d8b45a'}
                  onChange={(e) => setDrafts({ ...drafts, [g.id]: { ...d, accent: e.target.value } })}
                  className="h-8 w-9 cursor-pointer rounded border border-line bg-transparent" title="Accent colour" />
                <input className={inputCls} value={d.name || ''}
                  onChange={(e) => setDrafts({ ...drafts, [g.id]: { ...d, name: e.target.value } })} />
                <button onClick={() => save({ ...d, published: !g.published })} title={g.published ? 'Unpublish' : 'Publish'}
                  className="rounded-lg border border-line p-2 text-muted hover:text-gold">
                  {g.published ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => save(d)} className="rounded-lg border border-gold/40 p-2 text-gold hover:bg-gold/10" title="Save">
                  <Save size={14} />
                </button>
                <button onClick={async () => { if (confirm(`Delete genre "${g.name}"?`)) { await apiFetch('/api/genres', { method: 'DELETE', auth: true, body: { id: g.id } }).catch(() => {}); reload(); } }}
                  className="rounded-lg border border-line p-2 text-muted hover:text-crimson" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
              <input className={`${inputCls} mt-2`} placeholder="Short description" value={d.description || ''}
                onChange={(e) => setDrafts({ ...drafts, [g.id]: { ...d, description: e.target.value } })} />
            </div>
          );
        })}
        {adding && (
          <div className="rounded-xl border border-gold/40 bg-ink p-3.5">
            <div className="flex items-center gap-2.5">
              <input type="color" value={adding.accent} onChange={(e) => setAdding({ ...adding, accent: e.target.value })}
                className="h-8 w-9 cursor-pointer rounded border border-line bg-transparent" />
              <input className={inputCls} placeholder="Genre name" value={adding.name}
                onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
              <button onClick={() => save(adding)} className="rounded-lg bg-gold p-2 text-ink" title="Create"><Save size={14} /></button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ACCENT_CHOICES.map((c) => (
                <button key={c} onClick={() => setAdding({ ...adding, accent: c })}
                  className="h-5 w-5 rounded-full border border-white/20" style={{ background: c }} aria-label={`Accent ${c}`} />
              ))}
            </div>
            <input className={`${inputCls} mt-2`} placeholder="Short description" value={adding.description}
              onChange={(e) => setAdding({ ...adding, description: e.target.value })} />
          </div>
        )}
      </div>
    </section>
  );
}

function CollectionPanel({ collections, reload }: { collections: Collection[]; reload: () => void }) {
  const blank = { name: '', description: '', image_url: '', published: true };
  const [drafts, setDrafts] = useState<Record<number, Partial<Collection>>>({});
  const [adding, setAdding] = useState<typeof blank | null>(null);

  const save = async (c: Partial<Collection>) => {
    await apiFetch('/api/collections', { method: c.id ? 'PUT' : 'POST', auth: true, body: { ...collections.find((x) => x.id === c.id), ...c } }).catch(() => {});
    setAdding(null); setDrafts({}); reload();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= collections.length) return;
    const a = collections[idx], b = collections[j];
    await Promise.all([
      apiFetch('/api/collections', { method: 'PUT', auth: true, body: { ...a, sort_order: b.sort_order } }),
      apiFetch('/api/collections', { method: 'PUT', auth: true, body: { ...b, sort_order: a.sort_order } }),
    ]);
    reload();
  };

  const upload = async (file: File, id?: number) => {
    const { url } = await uploadImage('artwork', file, true);
    if (!url) return;
    if (id) setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? collections.find((c) => c.id === id)!), image_url: url } }));
    else setAdding((a) => (a ? { ...a, image_url: url } : a));
  };

  const row = (c: Partial<Collection>, isNew: boolean) => (
    <div key={c.id ?? 'new'} className={`rounded-xl border ${isNew ? 'border-gold/40' : 'border-line'} bg-ink p-3.5`}>
      <div className="flex items-center gap-2.5">
        {!isNew && (
          <span className="flex flex-col">
            <button onClick={() => move(collections.findIndex((x) => x.id === c.id), -1)} disabled={collections.findIndex((x) => x.id === c.id) === 0} className="text-muted hover:text-gold disabled:opacity-20" aria-label="Move up"><ArrowUp size={12} /></button>
            <button onClick={() => move(collections.findIndex((x) => x.id === c.id), 1)} disabled={collections.findIndex((x) => x.id === c.id) === collections.length - 1} className="text-muted hover:text-gold disabled:opacity-20" aria-label="Move down"><ArrowDown size={12} /></button>
          </span>
        )}
        {c.image_url && <img src={c.image_url} alt="" className="h-9 w-9 rounded-lg object-cover" />}
        <input className={inputCls} placeholder="Collection name" value={c.name || ''}
          onChange={(e) => isNew
            ? setAdding((a) => a && { ...a, name: e.target.value })
            : setDrafts({ ...drafts, [c.id!]: { ...(drafts[c.id!] ?? collections.find((x) => x.id === c.id)!), name: e.target.value } })} />
        <label className="cursor-pointer rounded-lg border border-line p-2 text-muted hover:text-gold" title="Upload image">
          <Upload size={14} />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], isNew ? undefined : c.id)} />
        </label>
        {!isNew && (
          <button onClick={() => save({ ...(drafts[c.id!] ?? c), published: !c.published })} title={c.published ? 'Unpublish' : 'Publish'}
            className="rounded-lg border border-line p-2 text-muted hover:text-gold">
            {c.published ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
        <button onClick={() => save(c)} className={`rounded-lg p-2 ${isNew ? 'bg-gold text-ink' : 'border border-gold/40 text-gold hover:bg-gold/10'}`} title="Save">
          <Save size={14} />
        </button>
        {!isNew && (
          <button onClick={async () => { if (confirm(`Delete collection "${c.name}"?`)) { await apiFetch('/api/collections', { method: 'DELETE', auth: true, body: { id: c.id } }).catch(() => {}); reload(); } }}
            className="rounded-lg border border-line p-2 text-muted hover:text-crimson" title="Delete">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <input className={`${inputCls} mt-2`} placeholder="Short description" value={c.description || ''}
        onChange={(e) => isNew
          ? setAdding((a) => a && { ...a, description: e.target.value })
          : setDrafts({ ...drafts, [c.id!]: { ...(drafts[c.id!] ?? collections.find((x) => x.id === c.id)!), description: e.target.value } })} />
    </div>
  );

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-bold">Collections</h2>
        <button onClick={() => setAdding(blank)} className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-[11px] font-bold text-ink">
          <Plus size={13} /> Add collection
        </button>
      </div>
      <div className="space-y-3">
        {collections.map((c) => row(drafts[c.id] ?? c, false))}
        {adding && row(adding, true)}
      </div>
    </section>
  );
}
