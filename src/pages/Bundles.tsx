import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import type { Bundle } from '../lib/types';
import BundleCard from '../components/BundleCard';
import Reveal from '../components/Reveal';
import { PageHeader, Loader, EmptyState } from '../components/UI';

export default function Bundles() {
  useSEO('Bundles', 'DJ SHAGGY value bundles — multiple playlists at one lower price.');
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Bundle[]>('/api/bundles')
      .then(setBundles)
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Bigger crates, better value"
        title={<>Playlist <span className="gold-text">Bundles</span></>}
        sub="Each bundle unlocks every included playlist via Google Drive after payment verification — at a serious discount versus buying separately."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {loading ? <Loader /> : bundles.length === 0 ? (
          <EmptyState title="No bundles live right now" sub="Individual playlists are always available in the catalogue." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bundles.map((b, i) => (
              <Reveal key={b.id} delay={i * 0.08}>
                <BundleCard bundle={b} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
