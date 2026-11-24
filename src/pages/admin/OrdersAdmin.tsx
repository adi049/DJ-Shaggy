import { useEffect, useState } from 'react';
import {
  RefreshCw, X, CheckCircle2, PauseCircle, XCircle, ExternalLink,
  MailCheck, MailWarning, StickyNote, Search, Send, History, Download, RotateCcw, PackageCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../lib/api';
import type { Order } from '../../lib/types';
import { AdminHeader, inputCls, Field } from './AdminLayout';
import { Loader, EmptyState, StatusPill } from '../../components/UI';
import { fmtDate, inr, cx } from '../../lib/utils';
import { useEsc } from '../../hooks/useEsc';

const FILTERS = [
  { v: 'all', l: 'All' },
  { v: 'pending_verification', l: 'Pending' },
  { v: 'verified', l: 'Verified' },
  { v: 'on_hold', l: 'On Hold' },
  { v: 'rejected', l: 'Rejected' },
];

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<Order | null>(null);
  useEsc(!!active, () => setActive(null));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ status: filter });
      if (search.trim()) sp.set('search', search.trim());
      const data = await apiFetch<Order[]>(`/api/orders?${sp}`, { auth: true });
      setOrders(data);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const exportCsv = () => {
    const escCsv = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Order ID', 'Date', 'Customer', 'Email', 'Phone', 'Items', 'Amount INR', 'Discount Code', 'UTR', 'Payment Status', 'Delivery Status'],
      ...orders.map((o) => [
        o.id, fmtDate(o.created_at), o.customer_name, o.email, o.phone,
        o.items.map((i) => i.name).join(' | '), o.amount, o.discount_code || '', o.utr || '',
        o.payment_status, o.delivery_status,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(escCsv).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `djshaggy-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [search]);

  const act = async (action: string) => {
    if (!active) return;
    setBusy(action); setBanner(null);
    try {
      const updated = await apiFetch<Order & { email_sent?: boolean; email_note?: string }>('/api/orders', {
        method: 'PUT', auth: true,
        body: { id: active.id, action, note },
      });
      setBanner({
        ok: true,
        text: action === 'approve'
          ? updated.email_sent
            ? 'Payment verified — delivery email sent to the customer.'
            : `Payment verified & marked delivered. Email NOT sent: ${updated.email_note || 'email service not configured'}. Share links manually if needed.`
          : action === 'reject'
            ? updated.email_sent ? 'Order rejected — customer notified by email.' : `Order rejected. Email not sent (${updated.email_note || 'email not configured'}).`
            : action === 'hold' ? 'Order placed on hold.' : 'Note saved.',
      });
      setActive(null); setNote('');
      load();
    } catch (e: any) {
      setBanner({ ok: false, text: e.message });
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <AdminHeader
        title="Orders"
        sub="Verify payments manually in your bank/UPI app, then approve & deliver."
        right={<div className="flex gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>}
      />

      {banner && (
        <div className={cx('mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm',
          banner.ok ? 'border-jade/30 bg-jade/10 text-jade' : 'border-crimson/30 bg-crimson/10 text-crimson')}>
          {banner.ok ? <MailCheck size={16} className="mt-0.5 shrink-0" /> : <MailWarning size={16} className="mt-0.5 shrink-0" />}
          {banner.text}
        </div>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order ID, email, name, phone or UTR\u2026"
          className="w-full rounded-xl border border-line bg-panel py-2.5 pl-10 pr-4 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={cx('rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
              filter === f.v ? 'border-gold bg-gold/12 text-gold' : 'border-line text-muted hover:text-silver')}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : orders.length === 0 ? (
        <EmptyState title="No orders in this view" sub="New orders appear here as soon as customers check out." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-coal text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">UTR</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-panel">
              {orders.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-panel2/60">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-silver">{o.id}</p>
                    <p className="text-[11px] text-muted">{fmtDate(o.created_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-silver">{o.customer_name}</p>
                    <p className="text-[11px] text-muted">{o.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{o.items.length} item{o.items.length === 1 ? '' : 's'}</td>
                  <td className="px-4 py-3 font-semibold text-gold">{inr(o.amount)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">{o.utr || '—'}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status_label || ''} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setActive(o); setNote(o.admin_note || ''); }}
                      className="rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold/10"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {active && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm"
              onClick={() => setActive(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-line bg-coal p-6"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="font-mono text-lg font-bold text-gold">{active.id}</p>
                  <p className="text-xs text-muted">{fmtDate(active.created_at)}</p>
                </div>
                <button onClick={() => setActive(null)} className="rounded-lg p-2 text-muted hover:bg-panel2" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4"><StatusPill status={active.status_label || ''} /></div>

              <section className="mb-5 rounded-xl border border-line bg-panel p-4">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Customer</h3>
                <p className="text-sm font-semibold text-silver">{active.customer_name}</p>
                <p className="text-xs text-muted">{active.email}</p>
                <p className="text-xs text-muted">{active.phone}</p>
              </section>

              <section className="mb-5 rounded-xl border border-line bg-panel p-4">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Playlists purchased</h3>
                <ul className="space-y-2">
                  {active.items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-silver">{it.name} <span className="text-[10px] uppercase text-muted">({it.type})</span></span>
                      <span className="text-gold">{inr(it.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
                  <div className="flex justify-between"><span>Subtotal</span><span>{inr(active.subtotal)}</span></div>
                  {!!active.discount_amount && (
                    <div className="flex justify-between text-jade"><span>Discount {active.discount_code && `(${active.discount_code})`}</span><span>-{inr(active.discount_amount)}</span></div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-silver"><span>Total</span><span className="text-gold">{inr(active.amount)}</span></div>
                </div>
              </section>

              <section className="mb-5 rounded-xl border border-line bg-panel p-4">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Payment proof</h3>
                <p className="text-xs text-muted">UTR / Ref: <span className="font-mono text-silver">{active.utr || 'Not submitted'}</span></p>
                {active.screenshot_url ? (
                  <a href={active.screenshot_url} target="_blank" rel="noreferrer" className="mt-3 block">
                    <img src={active.screenshot_url} alt="Payment screenshot" className="max-h-64 rounded-lg border border-line" />
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-azure"><ExternalLink size={11} /> Open full size (link expires in 10 min)</span>
                  </a>
                ) : (
                  <p className="mt-2 text-[11px] text-muted">No screenshot uploaded.</p>
                )}
                <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/5 p-2.5 text-[11px] leading-relaxed text-amber-200/80">
                  Verify this payment in YOUR bank/UPI app before approving. Approving emails the Drive links for the purchased items only.
                </p>
              </section>

              <Field label="Admin note (internal / rejection reason)">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls}
                  placeholder="Optional note…" />
              </Field>

              <div className="mt-5 space-y-2.5">
                <button
                  onClick={() => act('approve')}
                  disabled={!!busy || active.payment_status === 'verified'}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-jade py-3 text-sm font-bold text-ink transition-all hover:brightness-110 disabled:opacity-40"
                >
                  <CheckCircle2 size={16} /> {busy === 'approve' ? 'Verifying & delivering…' : 'Approve & Deliver playlists'}
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => act('hold')}
                    disabled={!!busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-400/40 py-2.5 text-xs font-bold text-orange-300 hover:bg-orange-400/10 disabled:opacity-40"
                  >
                    <PauseCircle size={14} /> Put on hold
                  </button>
                  <button
                    onClick={() => act('reject')}
                    disabled={!!busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-crimson/40 py-2.5 text-xs font-bold text-crimson hover:bg-crimson/10 disabled:opacity-40"
                  >
                    <XCircle size={14} /> Reject order
                  </button>
                </div>
                <button
                  onClick={() => act('note')}
                  disabled={!!busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-xs font-semibold text-muted hover:text-silver disabled:opacity-40"
                >
                  <StickyNote size={14} /> Save note only
                </button>
                {active.payment_status === 'verified' && (
                  <button
                    onClick={() => act('resend_delivery')}
                    disabled={!!busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-azure/40 py-2.5 text-xs font-bold text-azure hover:bg-azure/10 disabled:opacity-40"
                  >
                    <Send size={14} /> {busy === 'resend_delivery' ? 'Sending\u2026' : active.delivery_status === 'delivered' ? 'Resend delivery email' : 'Send delivery email now'}
                  </button>
                )}
                {active.payment_status === 'verified' && active.delivery_status !== 'delivered' && (
                  <button
                    onClick={() => act('mark_delivered')}
                    disabled={!!busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-jade/40 py-2.5 text-xs font-bold text-jade hover:bg-jade/10 disabled:opacity-40"
                  >
                    <PackageCheck size={14} /> Mark delivered manually (links shared outside email)
                  </button>
                )}
                {(active.payment_status === 'verified' || active.delivery_status === 'delivered') && (
                  <button
                    onClick={() => { if (confirm(`Record a refund for ${active.id} (₹${active.amount})? This logs it in the order history; the actual money transfer happens in your UPI app.`)) act('refund'); }}
                    disabled={!!busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-400/40 py-2.5 text-xs font-bold text-orange-300 hover:bg-orange-400/10 disabled:opacity-40"
                  >
                    <RotateCcw size={14} /> Record refund
                  </button>
                )}
              </div>

              {active.delivery_email_note && (
                <p className="mt-4 rounded-lg border border-crimson/30 bg-crimson/10 p-3 text-[11px] text-crimson">
                  Last delivery email issue: {active.delivery_email_note}
                </p>
              )}

              {/* Order history timeline */}
              {!!active.order_events?.length && (
                <section className="mt-6 rounded-xl border border-line bg-panel p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <History size={13} /> History
                  </h3>
                  <ul className="space-y-2.5">
                    {[...active.order_events]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((e) => (
                        <li key={e.id} className="flex items-start gap-2.5 text-xs">
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                            e.event.includes('approved') || e.event.includes('resent') ? 'bg-jade'
                            : e.event === 'rejected' ? 'bg-crimson'
                            : e.event === 'on_hold' ? 'bg-orange-300' : 'bg-gold'
                          }`} />
                          <div className="min-w-0">
                            <p className="font-semibold capitalize text-silver">{e.event.replace(/_/g, ' ')}</p>
                            {e.note && <p className="text-muted">{e.note}</p>}
                            <p className="text-[10px] text-muted/70">{new Date(e.created_at).toLocaleString('en-IN')} \u2022 {e.actor}</p>
                          </div>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
