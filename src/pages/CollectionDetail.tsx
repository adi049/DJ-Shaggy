import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import type { Collection, Product } from '../lib/types';
import ProductCard from '../components/ProductCard';
import { PageHeader, EmptyState, SkeletonGrid } from '../components/UI';

export default function CollectionDetail() {
  const { slug } = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useSEO(collection ? collection.name : 'Collection', collection?.description);

  useEffect(() => {
    setLoading(true);
    apiFetch<Collection[]>('/api/collections')
      .then(async (cs) => {
        const c = cs.find((x) => x.slug === slug);
        if (!c) { setNotFound(true); return; }
        setCollection(c);
        const prods = await apiFetch<Product[]>(`/api/products?collection=${c.id}`);
        setProducts(prods);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Collection not found</h1>
        <Link to="/collections" className="mt-4 inline-flex items-center gap-2 text-sm text-gold"><ArrowLeft size={15} /> All collections</Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Collection" title={collection ? collection.name : '…'} sub={collection?.description} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Link to="/collections" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-gold">
          <ArrowLeft size={14} /> All collections
        </Link>
        {loadError && (
          <div className="mb-6 rounded-xl border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
            Couldn't load this collection \u2014 check your connection and refresh.
          </div>
        )}
        {loading ? <SkeletonGrid count={6} /> : products.length === 0 ? (
          <EmptyState title="No playlists in this collection yet" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
