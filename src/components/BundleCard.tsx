import { ShoppingCart, Check, Package } from 'lucide-react';
import type { Bundle } from '../lib/types';
import { useCart } from '../context/CartContext';
import { discountPct, inr, cx } from '../lib/utils';
import Img from './Img';

export default function BundleCard({ bundle }: { bundle: Bundle }) {
  const cart = useCart();
  const inCart = cart.has('bundle', bundle.id);
  const pct = discountPct(bundle.price, bundle.original_price);
  const tracks = (bundle.products || []).reduce((s, p) => s + (p.track_count || 0), 0);

  return (
    <div className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-b from-panel2 to-panel">
      <div className="relative aspect-[4/3] overflow-hidden bg-coal">
        {bundle.artwork_url ? (
          <Img src={bundle.artwork_url} alt={`${bundle.name} artwork`} loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package size={48} className="text-gold/40" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold backdrop-blur">
          Bundle • Save more
        </span>
        {pct && (
          <span className="absolute right-3 top-3 rounded-full bg-crimson px-2.5 py-1 text-[10px] font-bold text-white">-{pct}%</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-lg font-bold tracking-tight text-silver transition-colors group-hover:text-gold-soft">{bundle.name}</h3>
        <p className="line-clamp-2 text-sm text-muted">{bundle.description}</p>
        {!!bundle.products?.length && (
          <ul className="space-y-1 text-xs text-muted">
            {bundle.products.slice(0, 4).map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-gold" /> {p.name}
              </li>
            ))}
            {bundle.products.length > 4 && (
              <li className="text-gold/80">+ {bundle.products.length - 4} more playlists</li>
            )}
          </ul>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xl font-bold text-gold">{inr(bundle.price)}</span>
              {bundle.original_price && bundle.original_price > bundle.price && (
                <span className="text-xs text-muted line-through">{inr(bundle.original_price)}</span>
              )}
            </div>
            {tracks > 0 && <span className="text-[11px] text-muted">{tracks} tracks total</span>}
          </div>
          <button
            onClick={() => !inCart && cart.add({
              type: 'bundle', id: bundle.id, name: bundle.name,
              slug: bundle.slug, price: bundle.price, artwork_url: bundle.artwork_url,
            })}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70',
              inCart ? 'cursor-default bg-jade/15 text-jade' : 'bg-gold text-ink hover:-translate-y-0.5 hover:bg-gold-soft hover:shadow-[0_8px_20px_-6px_rgba(216,180,90,0.5)] active:scale-95'
            )}
          >
            {inCart ? <Check size={14} /> : <ShoppingCart size={14} />}
            {inCart ? 'Added' : 'Add bundle'}
          </button>
        </div>
      </div>
    </div>
  );
}
