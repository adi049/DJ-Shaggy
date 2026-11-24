import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import { Loader, EmptyState } from '../components/UI';
import Img from '../components/Img';
import { fmtDate } from '../lib/utils';
import type { Post } from './Blog';

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useSEO(
    post ? (post.seo_title || post.title) : 'Blog',
    post ? (post.seo_desc || post.excerpt) : undefined,
    post?.image_url || undefined
  );

  useEffect(() => {
    setLoading(true);
    apiFetch<Post | null>(`/api/posts?slug=${slug}`)
      .then((p) => { if (!p) setMissing(true); setPost(p); })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loader label="Loading post\u2026" />;
  if (missing || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <EmptyState title="Post not found" sub="It may be unpublished or the link is wrong."
          action={<Link to="/blog" className="mt-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink">All posts</Link>} />
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/blog" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-gold">
        <ArrowLeft size={14} /> All posts
      </Link>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">{fmtDate(post.created_at)} \u2022 {post.author}</p>
      <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
      {post.image_url && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line">
          <Img src={post.image_url} alt={post.title} className="w-full object-cover" />
        </div>
      )}
      <div className="mt-7 whitespace-pre-line text-[15px] leading-relaxed text-silver/85">
        {post.content}
      </div>
    </article>
  );
}
