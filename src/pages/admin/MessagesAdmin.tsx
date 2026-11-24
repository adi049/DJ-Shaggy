import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Trash2, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { SupportMessage } from '../../lib/types';
import { AdminHeader } from './AdminLayout';
import { Loader, EmptyState } from '../../components/UI';
import { fmtDate, cx } from '../../lib/utils';

export default function MessagesAdmin() {
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setItems(await apiFetch<SupportMessage[]>('/api/messages', { auth: true }).catch(() => []));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <AdminHeader title="Support Messages" sub="Enquiries submitted through the Contact page."
        right={<button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
          <RefreshCw size={14} /> Refresh
        </button>} />

      {loading ? <Loader /> : items.length === 0 ? (
        <EmptyState title="Inbox zero" sub="Customer messages will land here." />
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className={cx('rounded-xl border bg-panel p-4', m.resolved ? 'border-line opacity-60' : 'border-gold/25')}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-silver">{m.subject}</p>
                  <p className="text-[11px] text-muted">
                    {m.name} • <a href={`mailto:${m.email}`} className="text-azure hover:underline">{m.email}</a> • {fmtDate(m.created_at)}
                  </p>
                </div>
                <button
                  onClick={async () => { await apiFetch('/api/messages', { method: 'PUT', auth: true, body: { id: m.id, resolved: !m.resolved } }).catch(() => {}); load(); }}
                  className={cx('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold',
                    m.resolved ? 'border-line text-muted' : 'border-jade/40 text-jade hover:bg-jade/10')}
                >
                  {m.resolved ? <Circle size={12} /> : <CheckCircle2 size={12} />}
                  {m.resolved ? 'Reopen' : 'Mark resolved'}
                </button>
                <button
                  onClick={async () => { if (confirm('Delete this message?')) { await apiFetch('/api/messages', { method: 'DELETE', auth: true, body: { id: m.id } }).catch(() => {}); load(); } }}
                  className="rounded-lg border border-line p-2 text-muted hover:text-crimson" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-lg bg-ink p-3.5 text-sm leading-relaxed text-silver/85">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
