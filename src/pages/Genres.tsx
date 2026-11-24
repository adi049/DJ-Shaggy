import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import type { Genre, Product } from '../lib/types';
import Reveal from '../components/Reveal';
import { PageHeader, Loader } from '../components/UI';

export default function Genres() {
  useSEO('Genres', 'Browse DJ SHAGGY playlists by genre — Bollywood, Punjabi, EDM, Hip-Hop, Retro, House and more.');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Genre[]>('/api/genres'),
      apiFetch<Product[]>('/api/products'),
    ]).then(([g, products]) => {
      setGenres(g);
      const c: Record<number, number> = {};
      products.forEach((p) => { if (p.genre_id) c[p.genre_id] = (c[p.genre_id] || 0) + 1; });
      setCounts(c);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Find your sound"
        title="Browse by Genre"
        sub="Every genre has its own energy. Pick yours and dig into curated, club-ready packs."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {loading ? <Loader /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {genres.map((g, i) => (
              <Reveal key={g.id} delay={Math.min(i, 5) * 0.06}>
                <Link
                  to={`/genres/${g.slug}`}
                  className="card-hover group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-panel p-5"
                >
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: `${g.accent}1f`, color: g.accent }}
                  >
                    <Layers size={24} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-bold text-silver group-hover:text-gold-soft">{g.name}</span>
                    <span className="mt-0.5 line-clamp-1 block text-xs text-muted">{g.description}</span>
                    <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: g.accent }}>
                      {counts[g.id] || 0} playlist{(counts[g.id] || 0) === 1 ? '' : 's'}
                    </span>
                  </span>
                  <ArrowRight size={17} className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-gold" />
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
