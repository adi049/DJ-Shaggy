import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import type { Genre, Product } from '../lib/types';
import ProductCard from '../components/ProductCard';
import { PageHeader, EmptyState, SkeletonGrid } from '../components/UI';

export default function GenreDetail() {
  const { slug } = useParams();
  const [genre, setGenre] = useState<Genre | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useSEO(genre ? `${genre.name} Playlists` : 'Genre', genre?.description);

  useEffect(() => {
    setLoading(true);
    apiFetch<Genre[]>('/api/genres')
      .then(async (gs) => {
        const g = gs.find((x) => x.slug === slug);
        if (!g) { setNotFound(true); return; }
        setGenre(g);
        const prods = await apiFetch<Product[]>(`/api/products?genre=${g.slug}`);
        setProducts(prods);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Genre not found</h1>
        <Link to="/genres" className="mt-4 inline-flex items-center gap-2 text-sm text-gold"><ArrowLeft size={15} /> All genres</Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Genre"
        title={genre ? genre.name : '…'}
        sub={genre?.description}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Link to="/genres" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-gold">
          <ArrowLeft size={14} /> All genres
        </Link>
        {loadError && (
          <div className="mb-6 rounded-xl border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
            Couldn't load this genre \u2014 check your connection and refresh.
          </div>
        )}
        {loading ? <SkeletonGrid count={6} /> : products.length === 0 ? (
          <EmptyState title="No playlists in this genre yet" sub="New packs drop regularly — check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
