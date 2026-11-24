import { Link } from 'react-router-dom';
import { ShoppingCart, Check, ListMusic, Flame, Play, Pause } from 'lucide-react';
import type { Product } from '../lib/types';
import { useCart } from '../context/CartContext';
import { usePlayer } from '../context/PlayerContext';
import { discountPct, inr, cx } from '../lib/utils';
import Img from './Img';

export default function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const player = usePlayer();
  const inCart = cart.has('product', product.id);
  const playingThis = player.track?.url === product.preview_audio_url && player.playing;
  const pct = discountPct(product.price, product.original_price);
  const accent = product.genres?.accent || '#d8b45a';

  return (
    <div className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel">
      <Link to={`/playlist/${product.slug}`} className="relative block aspect-square overflow-hidden bg-coal">
        {product.artwork_url ? (
          <Img
            src={product.artwork_url}
            alt={`${product.name} artwork`}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-panel2 to-coal">
            <ListMusic size={48} style={{ color: accent }} className="opacity-40" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
        {product.preview_audio_url && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              player.play({ name: product.name, url: product.preview_audio_url!, artwork_url: product.artwork_url, slug: product.slug });
            }}
            aria-label={playingThis ? 'Pause preview' : `Play preview of ${product.name}`}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-gold text-ink opacity-0 shadow-lg transition-all hover:scale-110 group-hover:opacity-100 focus-visible:opacity-100"
          >
            {playingThis ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
        )}
        {product.is_bestseller && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
            <Flame size={11} /> Bestseller
          </span>
        )}
        {pct && (
          <span className="absolute right-3 top-3 rounded-full bg-crimson px-2.5 py-1 text-[10px] font-bold text-white">
            -{pct}%
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
          {product.genres && (
            <span className="min-w-0 truncate" style={{ color: accent }}>{product.genres.name}</span>
          )}
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-muted" title={`${product.track_count} tracks`}>
            <ListMusic size={12} /> {product.track_count}
            <span className="hidden sm:inline">tracks</span>
          </span>
        </div>
        <Link
          to={`/playlist/${product.slug}`}
          className="font-display text-base font-semibold leading-snug tracking-tight text-silver transition-colors group-hover:text-gold-soft"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold text-gold">{inr(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-xs text-muted line-through">{inr(product.original_price)}</span>
            )}
          </div>
          <button
            onClick={() => !inCart && cart.add({
              type: 'product', id: product.id, name: product.name,
              slug: product.slug, price: product.price, artwork_url: product.artwork_url,
            })}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70',
              inCart
                ? 'cursor-default bg-jade/15 text-jade'
                : 'bg-gold text-ink hover:-translate-y-0.5 hover:bg-gold-soft hover:shadow-[0_8px_20px_-6px_rgba(216,180,90,0.5)] active:scale-95'
            )}
            aria-label={inCart ? 'Already in cart' : `Add ${product.name} to cart`}
          >
            {inCart ? <Check size={14} /> : <ShoppingCart size={14} />}
            {inCart ? 'Added' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
