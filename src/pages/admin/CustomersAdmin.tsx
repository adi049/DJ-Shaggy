import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, ChevronDown, User, Mail, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../lib/api';
import type { CustomerSummary } from '../../lib/types';
import { AdminHeader } from './AdminLayout';
import { Loader, EmptyState, StatusPill } from '../../components/UI';
import { fmtDate, inr, cx } from '../../lib/utils';

const LABELS: Record<string, string> = {
  pending_verification: 'Pending Verification', verified: 'Verified',
  rejected: 'Rejected', on_hold: 'On Hold', delivered: 'Delivered',
};

export default function CustomersAdmin() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setCustomers(await apiFetch<CustomerSummary[]>('/api/customers', { auth: true }).catch(() => []));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) =>
      c.email.toLowerCase().includes(s) || c.name.toLowerCase().includes(s) || c.phone.includes(s));
  }, [customers, q]);

  return (
    <div>
      <AdminHeader title="Customers" sub="Built from real orders \u2014 search a customer to see their full order history."
        right={<button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
          <RefreshCw size={14} /> Refresh
        </button>} />

      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone\u2026"
          className="w-full rounded-xl border border-line bg-panel py-2.5 pl-10 pr-4 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
      </div>

      {loading ? <Loader /> : shown.length === 0 ? (
        <EmptyState title={q ? 'No customers match that search' : 'No customers yet'} sub="Customers appear here automatically after their first order." />
      ) : (
        <div className="space-y-2.5">
          {shown.map((c) => (
            <div key={c.email} className="overflow-hidden rounded-xl border border-line bg-panel">
              <button onClick={() => setOpen(open === c.email ? null : c.email)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left" aria-expanded={open === c.email}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/12 text-gold"><User size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-silver">{c.name}</span>
                  <span className="block truncate text-[11px] text-muted">{c.email}</span>
                </span>
                <span className="text-right">
                  <span className="block text-xs font-semibold text-gold">{inr(c.total_spent)}</span>
                  <span className="text-[10px] text-muted">{c.order_count} order{c.order_count === 1 ? '' : 's'}</span>
                </span>
                <ChevronDown size={16} className={cx('text-muted transition-transform', open === c.email && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {open === c.email && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                    <div className="border-t border-line px-4 py-4">
                      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
                        <span className="inline-flex items-center gap-1.5"><Mail size={12} className="text-azure" /> {c.email}</span>
                        <span className="inline-flex items-center gap-1.5"><Phone size={12} className="text-jade" /> {c.phone}</span>
                        <span>Last order: {fmtDate(c.last_order_at)}</span>
                      </div>
                      <ul className="space-y-2">
                        {c.orders.map((o) => (
                          <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-ink px-3.5 py-2.5">
                            <span className="font-mono text-xs font-bold text-silver">{o.id}</span>
                            <span className="text-[11px] text-muted">{fmtDate(o.created_at)}</span>
                            <span className="min-w-0 flex-1 truncate text-[11px] text-muted">
                              {o.items.map((i) => i.name).join(', ')}
                            </span>
                            <span className="text-xs font-semibold text-gold">{inr(o.amount)}</span>
                            <StatusPill status={o.delivery_status === 'delivered' ? 'Delivered' : LABELS[o.payment_status] || o.payment_status} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
