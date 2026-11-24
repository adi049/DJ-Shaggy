import { useState } from 'react';
import { Search, Package } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import type { Order } from '../lib/types';
import { PageHeader, StatusPill } from '../components/UI';
import { fmtDate, inr } from '../lib/utils';

export default function TrackOrder() {
  useSEO('Track Order', 'Track your DJ SHAGGY order status with your Order ID and email.');
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setOrder(null);
    try {
      const o = await apiFetch<Order>(`/api/orders?id=${encodeURIComponent(id.trim())}&email=${encodeURIComponent(email.trim())}`);
      setOrder(o);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Order status" title="Track Your Order" sub="Enter the Order ID from checkout (starts with DJS-) and the email you ordered with." />
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <form onSubmit={lookup} className="space-y-4 rounded-2xl border border-line bg-panel p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Order ID</label>
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="DJS-XXXXXXXX" required
              className="w-full rounded-xl border border-line bg-ink px-4 py-3 font-mono text-sm uppercase text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
              className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
          </div>
          {error && <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-3.5 py-2.5 text-xs text-crimson">{error}</p>}
          <button disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-sm font-bold text-ink hover:bg-gold-soft disabled:opacity-50">
            <Search size={15} /> {busy ? 'Checking…' : 'Track order'}
          </button>
        </form>

        {order && (
          <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Package size={20} className="text-gold" />
                <div>
                  <p className="font-mono text-sm font-bold text-silver">{order.id}</p>
                  <p className="text-[11px] text-muted">{fmtDate(order.created_at)}</p>
                </div>
              </div>
              <StatusPill status={order.status_label || 'Pending Verification'} />
            </div>
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-silver">{it.name}</span>
                  <span className="text-gold">{inr(it.price)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-bold">
              <span>Total</span><span className="text-gold">{inr(order.amount)}</span>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              {order.delivery_status === 'delivered'
                ? 'Delivered — your Drive links were emailed to you and are visible on your order confirmation page.'
                : 'Delivery happens after manual payment verification. Verified payments are usually processed the same day.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
