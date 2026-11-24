import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Disc3, Package, FileWarning, IndianRupee, Inbox, ArrowRight, CheckCircle2,
  Users, Clock, CheckCheck, HardDrive, Plus, Home, Images, BarChart3, ScrollText,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Order, Product, AdminStats } from '../../lib/types';
import { AdminHeader } from './AdminLayout';
import { Loader, StatusPill } from '../../components/UI';
import { fmtDate, inr } from '../../lib/utils';

function fmtBytes(n: number) {
  if (!n) return '0 MB';
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface Analytics {
  days: number; orders_total: number; orders_by_status: Record<string, number>;
  delivered: number; revenue_verified: number; avg_order_value: number;
  unique_customers: number; revenue_by_day: { date: string; total: number }[];
  top_products: { name: string; units: number; revenue: number }[];
}
interface AuditRow { id: number; actor: string; action: string; detail: string; created_at: string }

export default function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<AdminStats>('/api/stats', { auth: true }).catch(() => null),
      apiFetch<Order[]>('/api/orders', { auth: true }).catch(() => []),
      apiFetch<Product[]>('/api/products?admin=1', { auth: true }).catch(() => []),
      apiFetch<AuditRow[]>('/api/audit', { auth: true }).catch(() => []),
    ]).then(([s, o, p, au]) => { setStats(s); setOrders(o); setProducts(p); setAuditLog(au); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiFetch<Analytics>(`/api/analytics?days=${days}`, { auth: true }).then(setAnalytics).catch(() => setAnalytics(null));
  }, [days]);

  if (loading) return <Loader label="Loading dashboard…" />;

  const drafts = products.filter((p) => p.status === 'draft');

  const cards = [
    { icon: Package, label: 'Total orders', value: stats?.orders_total ?? orders.length, accent: '#4f8cff', to: '/admin/orders' },
    { icon: Clock, label: 'Pending verification', value: stats?.orders_pending ?? 0, accent: '#f0b429', to: '/admin/orders' },
    { icon: CheckCheck, label: 'Completed (delivered)', value: stats?.orders_delivered ?? 0, accent: '#2fd27d', to: '/admin/orders' },
    { icon: IndianRupee, label: 'Verified revenue', value: inr(stats?.revenue_verified ?? 0), accent: '#d8b45a', to: '/admin/orders' },
    { icon: Users, label: 'Customers', value: stats?.customers_total ?? 0, accent: '#f34fd0', to: '/admin/customers' },
    { icon: Disc3, label: 'Published products', value: `${stats?.products_published ?? 0}/${stats?.products_total ?? products.length}`, accent: '#22d3ee', to: '/admin/products' },
    { icon: FileWarning, label: 'Drafts to complete', value: drafts.length, accent: '#fb923c', to: '/admin/products' },
    { icon: HardDrive, label: 'Storage used', value: fmtBytes(stats?.storage_bytes ?? 0), accent: '#9a9aa3', to: '/admin/gallery' },
    { icon: Inbox, label: 'Open messages', value: stats?.messages_open ?? 0, accent: '#4f8cff', to: '/admin/messages' },
  ];

  const quickLinks = [
    { icon: Plus, label: 'New product', to: '/admin/products' },
    { icon: Clock, label: 'Review pending orders', to: '/admin/orders' },
    { icon: Home, label: 'Edit homepage', to: '/admin/homepage' },
    { icon: Images, label: 'Upload to gallery', to: '/admin/gallery' },
  ];

  return (
    <div>
      <AdminHeader title="Dashboard" sub="Store at a glance — live totals from the database, no placeholders." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((s) => (
          <Link key={s.label} to={s.to} className="card-hover rounded-2xl border border-line bg-panel p-4">
            <s.icon size={18} style={{ color: s.accent }} />
            <p className="mt-3 font-display text-xl font-bold text-silver">{s.value}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {quickLinks.map((q) => (
          <Link key={q.label} to={q.to}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-xs font-semibold text-silver transition-colors hover:border-gold/50 hover:text-gold">
            <q.icon size={13} className="text-gold" /> {q.label}
          </Link>
        ))}
      </div>

      {/* Analytics — real orders only */}
      <div className="mt-8 rounded-2xl border border-line bg-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold"><BarChart3 size={17} className="text-gold" /> Analytics</h2>
          <div className="flex gap-1.5">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${days === d ? 'border-gold bg-gold/12 text-gold' : 'border-line text-muted hover:text-silver'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        {!analytics ? (
          <p className="py-6 text-center text-sm text-muted">Loading analytics…</p>
        ) : analytics.orders_total === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No orders in the last {days} days — charts appear automatically once sales start.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Verified revenue by day</p>
              <div className="flex h-36 items-end gap-1.5">
                {analytics.revenue_by_day.map((d) => {
                  const max = Math.max(...analytics.revenue_by_day.map((x) => x.total), 1);
                  return (
                    <div key={d.date} className="group flex flex-1 flex-col items-center gap-1" title={`${d.date}: ₹${d.total.toLocaleString('en-IN')}`}>
                      <div className="w-full rounded-t bg-gradient-to-t from-gold-deep to-gold transition-all group-hover:from-gold group-hover:to-gold-soft"
                        style={{ height: `${Math.max(3, (d.total / max) * 120)}px` }} />
                      <span className="text-[9px] text-muted">{d.date.slice(8)}</span>
                    </div>
                  );
                })}
                {analytics.revenue_by_day.length === 0 && <p className="text-xs text-muted">No verified revenue in range.</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted">
                <span>Orders: <strong className="text-silver">{analytics.orders_total}</strong></span>
                <span>Verified revenue: <strong className="text-gold">{inr(analytics.revenue_verified)}</strong></span>
                <span>Avg order: <strong className="text-silver">{inr(analytics.avg_order_value)}</strong></span>
                <span>Unique customers: <strong className="text-silver">{analytics.unique_customers}</strong></span>
                {Object.entries(analytics.orders_by_status).map(([s, n]) => (
                  <span key={s} className="capitalize">{s.replace(/_/g, ' ')}: <strong className="text-silver">{n}</strong></span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Top products (units)</p>
              {analytics.top_products.length === 0 ? (
                <p className="text-xs text-muted">No sales in range.</p>
              ) : (
                <ul className="space-y-2">
                  {analytics.top_products.map((p) => (
                    <li key={p.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-silver">{p.name}</span>
                      <span className="shrink-0 font-semibold text-gold">{p.units}× · {inr(p.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Recent orders</h2>
            <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-gold">All orders <ArrowRight size={13} /></Link>
          </div>
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-silver">{o.id}</p>
                    <p className="truncate text-[11px] text-muted">{o.customer_name} • {fmtDate(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gold">{inr(o.amount)}</span>
                    <StatusPill status={o.status_label || ''} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold"><ScrollText size={15} className="text-gold" /> Admin activity</h2>
          </div>
          {auditLog.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No admin actions logged yet — product, order, settings and Drive changes will appear here.</p>
          ) : (
            <ul className="space-y-2.5">
              {auditLog.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <div className="min-w-0">
                    <p className="font-semibold text-silver">{a.action}</p>
                    {a.detail && <p className="truncate text-muted">{a.detail}</p>}
                    <p className="text-[10px] text-muted/70">{a.actor} • {fmtDate(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Drafts needing details</h2>
            <Link to="/admin/products" className="inline-flex items-center gap-1 text-xs font-semibold text-gold">Manage products <ArrowRight size={13} /></Link>
          </div>
          {drafts.length === 0 ? (
            <div className="flex items-center gap-2.5 py-8 text-sm text-muted">
              <CheckCircle2 size={16} className="text-jade" /> No drafts — everything is published or no Drive imports pending.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {drafts.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-silver">{p.name}</p>
                    <p className="text-[11px] text-muted">
                      {!p.artwork_url && 'Needs artwork • '}{!p.price && 'Needs price • '}{!p.delivery_link && !p.drive_folder_url && 'Needs delivery link'}
                    </p>
                  </div>
                  <StatusPill status="draft" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
