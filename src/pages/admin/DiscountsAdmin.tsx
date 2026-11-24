import { useEffect, useState } from 'react';
import { Plus, Trash2, Power } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Discount } from '../../lib/types';
import { AdminHeader, inputCls } from './AdminLayout';
import { Loader, EmptyState } from '../../components/UI';
import { inr, cx } from '../../lib/utils';

export default function DiscountsAdmin() {
  const [items, setItems] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', kind: 'percent', value: 10, min_amount: 0, max_discount: '', usage_limit: '', expires_at: '' });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setItems(await apiFetch<Discount[]>('/api/discounts', { auth: true }).catch(() => []));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.code.trim()) { setError('Code is required'); return; }
    setError('');
    const body = {
      ...form,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      active: true,
    };
    await apiFetch('/api/discounts', { method: 'POST', auth: true, body }).catch((e) => setError(e.message));
    setForm({ code: '', kind: 'percent', value: 10, min_amount: 0, max_discount: '', usage_limit: '', expires_at: '' });
    load();
  };

  return (
    <div>
      <AdminHeader title="Discounts" sub="Promo codes customers can apply in the cart." />

      <div className="mb-6 rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold"><Plus size={15} className="text-gold" /> New coupon</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <input className={inputCls} placeholder="CODE" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as 'percent' | 'flat' })}>
            <option value="percent">% off</option>
            <option value="flat">₹ flat off</option>
          </select>
          <input type="number" min={1} className={inputCls} placeholder="Value" value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          <input type="number" min={0} className={inputCls} placeholder="Min order ₹" value={form.min_amount}
            onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) })} />
          <input type="number" min={0} className={inputCls} placeholder="Max discount ₹ (optional)" value={form.max_discount}
            onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
          <input type="number" min={1} className={inputCls} placeholder="Usage limit (optional)" value={form.usage_limit}
            onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
          <input type="datetime-local" className={inputCls} value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })} aria-label="Expiry (optional)" />
          <button onClick={create} className="rounded-lg bg-gold px-4 py-2.5 text-xs font-bold text-ink hover:bg-gold-soft">Create coupon</button>
        </div>
        {error && <p className="mt-2 text-xs text-crimson">{error}</p>}
      </div>

      {loading ? <Loader /> : items.length === 0 ? (
        <EmptyState title="No discount codes" sub="Create your first promo code above." />
      ) : (
        <div className="grid gap-2.5">
          {items.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel p-4">
              <span className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-sm font-bold text-gold">{d.code}</span>
              <span className="text-sm text-silver">
                {d.kind === 'percent' ? `${d.value}% off` : `${inr(d.value)} flat off`}
              </span>
              {!!d.min_amount && <span className="text-xs text-muted">min {inr(d.min_amount)}</span>}
              {!!d.max_discount && <span className="text-xs text-muted">cap {inr(d.max_discount)}</span>}
              {!!d.usage_limit && <span className="text-xs text-muted">{d.used_count}/{d.usage_limit} used</span>}
              {d.expires_at && <span className="text-xs text-muted">expires {new Date(d.expires_at).toLocaleDateString('en-IN')}</span>}
              <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-bold', d.active ? 'bg-jade/15 text-jade' : 'bg-panel2 text-muted')}>
                {d.active ? 'ACTIVE' : 'DISABLED'}
              </span>
              <div className="ml-auto flex gap-2">
                <button onClick={async () => { await apiFetch('/api/discounts', { method: 'PUT', auth: true, body: { ...d, active: !d.active } }).catch(() => {}); load(); }}
                  className="rounded-lg border border-line p-2 text-muted hover:text-gold" title={d.active ? 'Disable' : 'Enable'}>
                  <Power size={14} />
                </button>
                <button onClick={async () => { if (confirm(`Delete code ${d.code}?`)) { await apiFetch('/api/discounts', { method: 'DELETE', auth: true, body: { id: d.id } }).catch(() => {}); load(); } }}
                  className="rounded-lg border border-line p-2 text-muted hover:text-crimson" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
