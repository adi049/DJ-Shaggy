import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import type { Collection, Product } from '../lib/types';
import Reveal from '../components/Reveal';
import { PageHeader, Loader, EmptyState } from '../components/UI';

export default function Collections() {
  useSEO('Collections', 'Curated DJ SHAGGY playlist collections for weddings, clubs, festivals and after-hours sets.');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Collection[]>('/api/collections'),
      apiFetch<Product[]>('/api/products'),
    ]).then(([c, products]) => {
      setCollections(c);
      const m: Record<number, number> = {};
      products.forEach((p) => { if (p.collection_id) m[p.collection_id] = (m[p.collection_id] || 0) + 1; });
      setCounts(m);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Curated lineups"
        title="Collections"
        sub="Playlists grouped by moment — pick the collection that matches your gig."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {loading ? <Loader /> : collections.length === 0 ? (
          <EmptyState title="No collections published yet" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {collections.map((c, i) => (
              <Reveal key={c.id} delay={Math.min(i, 3) * 0.07}>
                <Link to={`/collections/${c.slug}`} className="card-hover group relative block overflow-hidden rounded-2xl border border-line">
                  <div className="aspect-[16/8] overflow-hidden bg-panel">
                    {c.image_url && (
                      <img src={c.image_url} alt={c.name} loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                    <div>
                      <h3 className="font-display text-xl font-bold text-white group-hover:text-gold-soft">{c.name}</h3>
                      <p className="mt-1 line-clamp-1 text-xs text-silver/75">{c.description}</p>
                      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
                        {counts[c.id] || 0} playlist{(counts[c.id] || 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold transition-transform group-hover:translate-x-1">
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
