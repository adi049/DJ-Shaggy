import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSEO } from '../hooks/useSEO';
import { PageHeader, EmptyState } from '../components/UI';
import { inr } from '../lib/utils';

export default function Cart() {
  useSEO('Cart');
  const cart = useCart();
  const navigate = useNavigate();
  const total = cart.subtotal;

  return (
    <div>
      <PageHeader eyebrow="Your crate" title="Cart" sub="Review your playlists, apply a discount code and check out securely." />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {cart.items.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            sub="Dig through the catalogue and add some heat."
            action={<Link to="/catalogue" className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink">
              <ShoppingBag size={14} /> Browse catalogue
            </Link>}
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.key} className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-3.5">
                  {item.artwork_url ? (
                    <img src={item.artwork_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-panel2 text-gold">
                      <ShoppingBag size={20} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={item.type === 'product' ? `/playlist/${item.slug}` : '/bundles'}
                      className="block truncate font-display text-sm font-bold text-silver hover:text-gold-soft"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">
                      {item.type === 'bundle' ? 'Bundle' : 'Playlist'} • Digital delivery
                    </p>
                    <p className="mt-1 font-display text-sm font-bold text-gold">{inr(item.price)}</p>
                  </div>
                  <button
                    onClick={() => cart.remove(item.key)}
                    className="rounded-lg p-2 text-muted transition-colors hover:bg-crimson/10 hover:text-crimson"
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-2xl border border-gold/25 bg-panel p-6">
              <h2 className="font-display text-lg font-bold">Order summary</h2>

              <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
                <div className="flex justify-between text-muted">
                  <dt>Subtotal ({cart.count} item{cart.count === 1 ? '' : 's'})</dt>
                  <dd>{inr(cart.subtotal)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 font-display text-base font-bold">
                  <dt>Total</dt>
                  <dd className="text-gold">{inr(total)}</dd>
                </div>
              </dl>

              <button
                onClick={() => navigate('/checkout')}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-display text-sm font-bold text-ink transition-all hover:bg-gold-soft active:scale-95"
              >
                Proceed to checkout <ArrowRight size={16} />
              </button>
              <p className="mt-3 text-center text-[11px] text-muted">Manual UPI payment • Verified by a human • Drive delivery</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
