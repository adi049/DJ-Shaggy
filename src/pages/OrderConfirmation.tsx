import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Download, Clock, ExternalLink } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import { useSettings } from '../context/SettingsContext';
import type { Order } from '../lib/types';
import { Loader, EmptyState, StatusPill } from '../components/UI';
import { fmtDate, inr } from '../lib/utils';
import Reveal from '../components/Reveal';

export default function OrderConfirmation() {
  const { id } = useParams();
  useSEO(`Order ${id || ''}`);
  const { settings } = useSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const load = async (email: string) => {
    setLoading(true); setError('');
    try {
      const o = await apiFetch<Order>(`/api/orders?id=${encodeURIComponent(id || '')}&email=${encodeURIComponent(email)}`);
      setOrder(o);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const last = JSON.parse(sessionStorage.getItem('djs_last_order') || 'null');
      if (last && last.id === id) { load(last.email); return; }
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  if (loading) return <Loader label="Fetching your order…" />;

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <EmptyState title="Confirm your email to view this order"
          sub={error || 'Enter the email address used at checkout.'} />
        <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); load(emailInput); }}>
          <input
            type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
            placeholder="you@example.com"
            className="min-w-0 flex-1 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none"
          />
          <button className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-ink">View order</button>
        </form>
      </div>
    );
  }

  const delivered = order.delivery_status === 'delivered';

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Reveal>
        <div className="text-center">
          <CheckCircle2 size={52} className="mx-auto text-jade" />
          <h1 className="mt-4 font-display text-3xl font-bold">
            {delivered ? 'Your playlists are ready' : 'Order received'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Order <span className="font-mono font-bold text-gold">{order.id}</span> • placed {fmtDate(order.created_at)}
          </p>
          <div className="mt-4 flex justify-center">
            <StatusPill status={order.status_label || 'Pending Verification'} />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
          <h2 className="font-display text-base font-bold">Items</h2>
          <ul className="mt-3 divide-y divide-line">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-silver">{it.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gold">{inr(it.price)}</span>
                  {delivered && it.link && (
                    <a href={it.link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-jade px-3 py-1.5 text-[11px] font-bold text-ink hover:brightness-110">
                      <ExternalLink size={12} /> Open
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-line pt-4 font-display font-bold">
            <span>Total paid</span>
            <span className="text-gold">{inr(order.amount)}</span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.18}>
        <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-bold">
            {delivered ? <Download size={17} className="text-jade" /> : <Clock size={17} className="text-amber-300" />}
            What happens next
          </h2>
          {delivered ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Your payment has been verified and your Google Drive links are live above. We also sent them to{' '}
              <span className="text-silver">{order.email}</span>. Keep the email safe — and please don’t share the links publicly.
            </p>
          ) : (
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
              <li>Our team manually verifies your payment in the bank/UPI app (UTR: {order.utr ? <span className="font-mono text-silver">{order.utr}</span> : 'awaiting submission'}).</li>
              <li>Once verified, you receive an email at <span className="text-silver">{order.email}</span> with Google Drive links for exactly the playlists you bought.</li>
              <li>Questions meanwhile? Message us on{' '}
                <a className="font-semibold text-jade" target="_blank" rel="noreferrer"
                  href={`https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(`Hi! Question about order ${order.id}`)}`}>
                  WhatsApp ({settings.whatsapp.display || settings.site.phone_display})
                </a>, call{' '}
                <a className="font-semibold text-gold" href={`tel:${settings.site.phone_tel}`}>
                  {settings.site.phone_display}
                </a>{' '}
                or email{' '}
                <a className="font-semibold text-azure" href={`mailto:${settings.site.support_email}?subject=${encodeURIComponent(`Order ${order.id}`)}`}>
                  {settings.site.support_email}
                </a>.
              </li>
            </ol>
          )}
        </div>
      </Reveal>

      <div className="mt-8 flex justify-center gap-3">
        <Link to="/catalogue" className="rounded-xl bg-gold px-6 py-3 text-sm font-bold text-ink hover:bg-gold-soft">
          Continue browsing
        </Link>
        <Link to="/track" className="rounded-xl border border-line px-6 py-3 text-sm font-semibold text-silver hover:border-gold/50">
          Track anytime
        </Link>
      </div>
    </div>
  );
}
