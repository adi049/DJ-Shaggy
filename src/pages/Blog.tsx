import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PenLine } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import { PageHeader, Loader, EmptyState } from '../components/UI';
import Reveal from '../components/Reveal';
import Img from '../components/Img';
import { fmtDate } from '../lib/utils';

export interface Post {
  id: number; title: string; slug: string; excerpt: string; content?: string;
  image_url: string; author: string; created_at: string; seo_title?: string; seo_desc?: string; status?: string;
}

export default function Blog() {
  useSEO('Blog', 'Stories, release notes and DJ craft from DJ SHAGGY.');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Post[]>('/api/posts').then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Notes from the booth" title={<>The <span className="gold-text">Blog</span></>}
        sub="Release notes, mixing craft and behind-the-scenes from DJ SHAGGY." />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {loading ? <Loader /> : posts.length === 0 ? (
          <EmptyState title="No posts yet" sub="New write-ups land here \u2014 check back soon." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {posts.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 3) * 0.07}>
                <Link to={`/blog/${p.slug}`} className="card-hover group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel">
                  {p.image_url ? (
                    <div className="aspect-[16/9] overflow-hidden bg-coal">
                      <Img src={p.image_url} alt={p.title} loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-panel2 to-coal">
                      <PenLine size={36} className="text-gold/30" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">{fmtDate(p.created_at)} \u2022 {p.author}</p>
                    <h2 className="font-display text-lg font-bold leading-snug text-silver group-hover:text-gold-soft">{p.title}</h2>
                    <p className="line-clamp-2 text-sm text-muted">{p.excerpt}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-xs font-semibold text-gold">
                      Read <ArrowRight size={13} />
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
