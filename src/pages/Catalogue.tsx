import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import type { Product, Genre, Collection } from '../lib/types';
import ProductCard from '../components/ProductCard';
import { PageHeader, EmptyState, SkeletonGrid } from '../components/UI';
import { cx } from '../lib/utils';

const SORTS = [
  { v: 'newest', l: 'Newest first' },
  { v: 'popular', l: 'Most popular' },
  { v: 'price_asc', l: 'Price: low to high' },
  { v: 'price_desc', l: 'Price: high to low' },
  { v: 'tracks', l: 'Most tracks' },
  { v: 'name', l: 'Name A–Z' },
];

export default function Catalogue() {
  useSEO('Catalogue', 'Browse every premium DJ playlist by DJ SHAGGY. Search, filter by genre and collection, and sort by price or track count.');
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [q, setQ] = useState(params.get('q') || '');

  const genre = params.get('genre') || '';
  const collection = params.get('collection') || '';
  const sort = params.get('sort') || 'newest';
  const query = params.get('q') || '';
  const priceMin = params.get('price_min') || '';
  const priceMax = params.get('price_max') || '';
  const minTracks = params.get('min_tracks') || '';

  useEffect(() => {
    apiFetch<Genre[]>('/api/genres').then(setGenres).catch(() => {});
    apiFetch<Collection[]>('/api/collections').then(setCollections).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    const sp = new URLSearchParams();
    if (query) sp.set('q', query);
    if (genre) sp.set('genre', genre);
    if (collection) sp.set('collection', collection);
    if (sort) sp.set('sort', sort);
    if (priceMin) sp.set('price_min', priceMin);
    if (priceMax) sp.set('price_max', priceMax);
    if (minTracks) sp.set('min_tracks', minTracks);
    apiFetch<Product[]>(`/api/products?${sp}`)
      .then(setProducts)
      .catch(() => { setProducts([]); setLoadError(true); })
      .finally(() => setLoading(false));
  }, [query, genre, collection, sort]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const activeFilters = useMemo(() => [genre, collection, query, priceMin, priceMax, minTracks].filter(Boolean).length, [genre, collection, query, priceMin, priceMax, minTracks]);

  return (
    <div>
      <PageHeader
        eyebrow="The full crate"
        title="Playlist Catalogue"
        sub="Every published pack — search it, filter it, sort it. All playlists are delivered via Google Drive after manual payment verification."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <form
            className="relative min-w-0 flex-1 sm:max-w-sm"
            onSubmit={(e) => { e.preventDefault(); setParam('q', q.trim()); }}
          >
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search playlists, tags…"
              className="w-full rounded-xl border border-line bg-panel py-2.5 pl-10 pr-9 text-sm text-silver placeholder:text-muted/60 focus:border-gold/60 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => { setQ(''); setParam('q', ''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-silver" aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </form>
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="rounded-xl border border-line bg-panel px-3.5 py-2.5 text-sm text-silver focus:border-gold/60 focus:outline-none"
            aria-label="Sort products"
          >
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cx(
              'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium lg:hidden',
              filtersOpen || activeFilters ? 'border-gold/50 text-gold' : 'border-line text-silver'
            )}
          >
            <SlidersHorizontal size={15} /> Filters {activeFilters > 0 && `(${activeFilters})`}
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
          {/* Sidebar filters */}
          <aside className={cx('space-y-6 lg:block', filtersOpen ? 'block' : 'hidden')}>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">Genre</h3>
              <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
                <FilterChip active={!genre} onClick={() => setParam('genre', '')} label="All genres" />
                {genres.map((g) => (
                  <FilterChip key={g.id} active={genre === g.slug} onClick={() => setParam('genre', genre === g.slug ? '' : g.slug)}
                    label={g.name} color={g.accent} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">Price (₹)</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} placeholder="Min" value={priceMin}
                  onChange={(e) => setParam('price_min', e.target.value)}
                  className="w-20 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs text-silver focus:border-gold/60 focus:outline-none"
                  aria-label="Minimum price"
                />
                <span className="text-muted">–</span>
                <input
                  type="number" min={0} placeholder="Max" value={priceMax}
                  onChange={(e) => setParam('price_max', e.target.value)}
                  className="w-20 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs text-silver focus:border-gold/60 focus:outline-none"
                  aria-label="Maximum price"
                />
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">Min. tracks</h3>
              <div className="flex flex-wrap gap-2">
                {['', '25', '40', '50'].map((n) => (
                  <FilterChip key={n || 'any'} active={minTracks === n} onClick={() => setParam('min_tracks', n)}
                    label={n ? `${n}+` : 'Any'} />
                ))}
              </div>
            </div>
            {collections.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">Collection</h3>
                <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
                  <FilterChip active={!collection} onClick={() => setParam('collection', '')} label="All collections" />
                  {collections.map((c) => (
                    <FilterChip key={c.id} active={collection === String(c.id)}
                      onClick={() => setParam('collection', collection === String(c.id) ? '' : String(c.id))} label={c.name} />
                  ))}
                </div>
              </div>
            )}
            {(genre || collection || query || priceMin || priceMax || minTracks) && (
              <button
                onClick={() => { setQ(''); setParams({}, { replace: true }); }}
                className="text-xs font-semibold text-crimson hover:underline"
              >
                Clear all filters
              </button>
            )}
          </aside>

          {/* Grid */}
          <div>
            {loading ? (
              <SkeletonGrid count={8} />
            ) : loadError ? (
              <EmptyState
                title="Couldn't load the catalogue"
                sub="A network hiccup or the database is waking up \u2014 try again."
                action={<button onClick={() => setParams((p) => new URLSearchParams(p), { replace: true })}
                  className="mt-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink">Retry</button>}
              />
            ) : products.length === 0 ? (
              <EmptyState
                title="No playlists match your filters"
                sub="Try a different search term or clear the filters to see the full catalogue."
                action={<button onClick={() => { setQ(''); setParams({}, { replace: true }); }}
                  className="mt-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink">Clear filters</button>}
              />
            ) : (
              <>
                <p className="mb-4 text-xs text-muted">{products.length} playlist{products.length === 1 ? '' : 's'}</p>
                <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, color }: {
  active: boolean; onClick: () => void; label: string; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
        active ? 'border-gold bg-gold/12 text-gold' : 'border-line bg-panel text-muted hover:border-gold/40 hover:text-silver'
      )}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
    </button>
  );
}
