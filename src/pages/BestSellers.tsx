import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import type { Product } from '../lib/types';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { PageHeader, EmptyState, SkeletonGrid } from '../components/UI';

export default function BestSellers() {
  useSEO('Best Sellers', 'The best-selling DJ SHAGGY playlists — the packs working DJs keep coming back for.');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Product[]>('/api/products?bestseller=1')
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Proven on dancefloors"
        title={<>Best <span className="gold-text">Sellers</span></>}
        sub="The most-purchased playlists in the store — battle-tested in clubs, weddings and festivals."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {loading ? <SkeletonGrid count={8} /> : products.length === 0 ? (
          <EmptyState title="No best sellers yet" sub="Check back soon — or browse the full catalogue meanwhile." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 7) * 0.05}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
