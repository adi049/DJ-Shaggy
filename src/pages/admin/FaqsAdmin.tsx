import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Faq } from '../../lib/types';
import { AdminHeader, inputCls } from './AdminLayout';
import { Loader, EmptyState } from '../../components/UI';

export default function FaqsAdmin() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<{ question: string; answer: string; category: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setFaqs(await apiFetch<Faq[]>('/api/faqs?all=1', { auth: true }).catch(() => []));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (f: Faq) => {
    await apiFetch('/api/faqs', { method: 'PUT', auth: true, body: f }).catch(() => {});
    load();
  };

  return (
    <div>
      <AdminHeader title="FAQs" sub="Answers shown on the FAQ page and used by the chat assistant."
        right={<button onClick={() => setAdding({ question: '', answer: '', category: 'General' })}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink hover:bg-gold-soft">
          <Plus size={14} /> Add FAQ
        </button>} />

      {loading ? <Loader /> : (
        <div className="space-y-3">
          {faqs.length === 0 && !adding && <EmptyState title="No FAQs yet" />}
          {faqs.map((f) => (
            <div key={f.id} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <input className={inputCls} value={f.question}
                    onChange={(e) => setFaqs(faqs.map((x) => x.id === f.id ? { ...x, question: e.target.value } : x))} />
                  <textarea rows={3} className={inputCls} value={f.answer}
                    onChange={(e) => setFaqs(faqs.map((x) => x.id === f.id ? { ...x, answer: e.target.value } : x))} />
                  <input className={`${inputCls} max-w-[220px]`} value={f.category} placeholder="Category"
                    onChange={(e) => setFaqs(faqs.map((x) => x.id === f.id ? { ...x, category: e.target.value } : x))} />
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => update(f)} className="rounded-lg border border-gold/40 p-2 text-gold hover:bg-gold/10" title="Save"><Save size={15} /></button>
                  <button onClick={() => update({ ...f, published: !f.published })} className="rounded-lg border border-line p-2 text-muted hover:text-gold" title={f.published ? 'Unpublish' : 'Publish'}>
                    {f.published ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={async () => { if (confirm('Delete this FAQ?')) { await apiFetch('/api/faqs', { method: 'DELETE', auth: true, body: { id: f.id } }).catch(() => {}); load(); } }}
                    className="rounded-lg border border-line p-2 text-muted hover:text-crimson" title="Delete"><Trash2 size={15} /></button>
                </div>
              </div>
              {!f.published && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted">Hidden (unpublished)</p>}
            </div>
          ))}

          {adding && (
            <div className="rounded-xl border border-gold/40 bg-panel p-4">
              <div className="space-y-2">
                <input className={inputCls} placeholder="Question" value={adding.question}
                  onChange={(e) => setAdding({ ...adding, question: e.target.value })} />
                <textarea rows={3} className={inputCls} placeholder="Answer" value={adding.answer}
                  onChange={(e) => setAdding({ ...adding, answer: e.target.value })} />
                <input className={`${inputCls} max-w-[220px]`} placeholder="Category" value={adding.category}
                  onChange={(e) => setAdding({ ...adding, category: e.target.value })} />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setAdding(null)} className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-muted">Cancel</button>
                <button
                  onClick={async () => {
                    if (!adding.question.trim() || !adding.answer.trim()) return;
                    await apiFetch('/api/faqs', { method: 'POST', auth: true, body: { ...adding, published: true, sort_order: faqs.length + 1 } }).catch(() => {});
                    setAdding(null); load();
                  }}
                  className="rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink">
                  Add FAQ
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
