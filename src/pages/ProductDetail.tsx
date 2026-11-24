import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Check, ListMusic, Flame, Tag, ArrowLeft,
  ShieldCheck, Download, Zap, FileAudio, Disc3, Play, Pause,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import type { Product } from '../lib/types';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import Eq from '../components/Eq';
import { Loader, EmptyState, SectionHead } from '../components/UI';
import { discountPct, inr, cx } from '../lib/utils';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { settings } = useSettings();
  const player = usePlayer();
  const [data, setData] = useState<{ product: Product | null; related: Product[] }>({ product: null, related: [] });
  const [loading, setLoading] = useState(true);

  const p = data.product;
  useSEO(p ? p.name : 'Playlist', p?.description?.slice(0, 155), p?.artwork_url);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ product: Product | null; related: Product[] }>(`/api/products?slug=${slug}`)
      .then(setData)
      .catch(() => setData({ product: null, related: [] }))
      .finally(() => setLoading(false));
  }, [slug]);

  // Product structured data (JSON-LD)
  useEffect(() => {
    if (!p) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'product-jsonld';
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      image: p.artwork_url ? [new URL(p.artwork_url, window.location.origin).href] : undefined,
      description: p.description,
      brand: { '@type': 'Brand', name: 'DJ SHAGGY' },
      offers: {
        '@type': 'Offer',
        price: p.price,
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
      },
    });
    document.head.appendChild(el);
    return () => { document.getElementById('product-jsonld')?.remove(); };
  }, [p]);

  if (loading) return <Loader label="Loading playlist…" />;
  if (!p) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <EmptyState
          title="Playlist not found"
          sub="It may have been unpublished or the link is wrong."
          action={<Link to="/catalogue" className="mt-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink">Browse catalogue</Link>}
        />
      </div>
    );
  }

  const pct = discountPct(p.price, p.original_price);
  const inCart = cart.has('product', p.id);
  const add = () => cart.add({ type: 'product', id: p.id, name: p.name, slug: p.slug, price: p.price, artwork_url: p.artwork_url });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/catalogue" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-gold">
        <ArrowLeft size={14} /> Back to catalogue
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Artwork */}
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-panel">
            {p.artwork_url ? (
              <img src={p.artwork_url} alt={`${p.name} cover artwork`} className="w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-panel2 to-coal">
                <ListMusic size={72} className="text-gold/30" />
              </div>
            )}
            {p.is_bestseller && (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink">
                <Flame size={12} /> Bestseller
              </span>
            )}
            {pct && (
              <span className="absolute right-4 top-4 rounded-full bg-crimson px-3 py-1.5 text-[11px] font-bold text-white">Save {pct}%</span>
            )}
          </div>
        </Reveal>

        {/* Info */}
        <Reveal delay={0.1}>
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider">
              {p.genres && (
                <Link to={`/genres/${p.genres.slug}`} style={{ color: p.genres.accent }} className="hover:underline">
                  {p.genres.name}
                </Link>
              )}
              <span className="text-muted">•</span>
              <span className="inline-flex items-center gap-1.5 text-muted"><ListMusic size={13} /> {p.track_count} tracks</span>
            </div>

            <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{p.name}</h1>

            <div className="mt-4 flex items-center gap-3">
              <Eq bars={7} height={20} color={p.genres?.accent || '#d8b45a'} />
              <span className="text-xs text-muted">Curated & mixed by DJ SHAGGY</span>
            </div>

            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-muted sm:text-[15px]">{p.description}</p>

            {p.preview_note && (
              <div className="mt-5 rounded-xl border border-line bg-panel p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">What you get</p>
                <p className="whitespace-pre-line text-sm text-silver/90">{p.preview_note}</p>
              </div>
            )}

            {p.preview_audio_url && (
              <div className="mt-5 rounded-xl border border-gold/25 bg-panel p-4">
                <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                  <Eq bars={4} height={12} /> Preview this playlist
                </p>
                <button
                  onClick={() => player.play({ name: p.name, url: p.preview_audio_url!, artwork_url: p.artwork_url, slug: p.slug })}
                  className="inline-flex items-center gap-2 rounded-xl bg-gold/15 px-5 py-2.5 text-sm font-bold text-gold transition-colors hover:bg-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  {player.track?.url === p.preview_audio_url && player.playing
                    ? <><Pause size={16} /> Pause preview</>
                    : <><Play size={16} /> Play preview</>}
                </button>
                <p className="mt-2 text-[11px] text-muted">Plays in the site player \u2014 keep browsing while it plays.</p>
              </div>
            )}

            {!!p.tags?.length && (
              <div className="mt-5 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] text-muted">
                    <Tag size={10} /> {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-7 rounded-2xl border border-gold/25 bg-gradient-to-br from-panel2 to-panel p-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-4xl font-bold gold-text">{inr(p.price)}</span>
                {p.original_price && p.original_price > p.price && (
                  <>
                    <span className="text-lg text-muted line-through">{inr(p.original_price)}</span>
                    {pct && <span className="rounded-full bg-crimson/15 px-2.5 py-1 text-xs font-bold text-crimson">{pct}% OFF</span>}
                  </>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted">One-time purchase • Instant access after payment verification</p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => { if (!inCart) add(); }}
                  className={cx(
                    'inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-display text-sm font-bold transition-all sm:flex-none',
                    inCart ? 'cursor-default bg-jade/15 text-jade' : 'bg-gold text-ink hover:bg-gold-soft active:scale-95'
                  )}
                >
                  {inCart ? <Check size={17} /> : <ShoppingCart size={17} />}
                  {inCart ? 'In your cart' : 'Add to cart'}
                </button>
                <button
                  onClick={() => { if (!inCart) add(); navigate('/checkout'); }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gold/40 px-6 py-3.5 font-display text-sm font-semibold text-gold transition-colors hover:bg-gold/10 sm:flex-none"
                >
                  <Zap size={16} /> Buy now
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileAudio, t: '320kbps MP3', d: 'DJ-ready quality' },
                { icon: ShieldCheck, t: 'Verified delivery', d: 'Manual payment check' },
                { icon: Download, t: 'Google Drive', d: 'Folder link by email' },
              ].map((f) => (
                <div key={f.t} className="rounded-xl border border-line bg-panel/60 p-3">
                  <f.icon size={16} className="text-gold" />
                  <p className="mt-1.5 text-xs font-bold text-silver">{f.t}</p>
                  <p className="text-[11px] text-muted">{f.d}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 text-[11px] leading-relaxed text-muted/80">
              <Disc3 size={11} className="mr-1 inline text-gold" />
              {settings.delivery.note} Delivery links are only issued for purchased products after verification.
            </p>
          </div>
        </Reveal>
      </div>

      {/* Related */}
      {data.related.length > 0 && (
        <div className="mt-20">
          <SectionHead eyebrow="Keep digging" title="You may also like" />
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {data.related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}
