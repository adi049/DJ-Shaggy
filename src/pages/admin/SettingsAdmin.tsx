import { useEffect, useState } from 'react';
import { Save, Upload, CheckCircle2, CreditCard, MessageCircle, Truck, Globe, Search, Cog } from 'lucide-react';
import { apiFetch, uploadImage } from '../../lib/api';
import { AdminHeader, inputCls, Field } from './AdminLayout';
import { Loader } from '../../components/UI';
import { cx } from '../../lib/utils';

type SettingsMap = Record<string, any>;

const TABS = [
  { id: 'payment', label: 'Payment & QR', icon: CreditCard },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'site', label: 'Website content', icon: Globe },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'general', label: 'General', icon: Cog },
];

function RestoreTool({ onError }: { onError: (m: string) => void }) {
  const [backup, setBackup] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const validate = async (f: File) => {
    onError('');
    setBusy(true); setResult(null);
    try {
      const parsed = JSON.parse(await f.text());
      const out = await apiFetch('/api/backup', { method: 'POST', auth: true, body: { backup: parsed } });
      setBackup(parsed);
      setPreview(out);
    } catch (e: any) {
      onError(e.message || 'Invalid backup file');
      setBackup(null); setPreview(null);
    } finally { setBusy(false); }
  };

  const runRestore = async () => {
    setBusy(true);
    try {
      const out = await apiFetch('/api/backup', { method: 'POST', auth: true, body: { backup, action: 'restore', confirm: confirmText } });
      setResult(out);
    } catch (e: any) { onError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-silver hover:border-gold/50 hover:text-gold">
        <Upload size={14} /> {busy ? 'Working…' : 'Choose backup JSON'}
        <input type="file" accept="application/json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) validate(f); e.target.value = ''; }} />
      </label>

      {preview && !result && (
        <div className="rounded-xl border border-line bg-ink p-4">
          <p className="mb-2 text-xs font-bold text-silver">
            Backup valid — exported {preview.exported_at ? new Date(preview.exported_at).toLocaleString('en-IN') : 'unknown date'}
          </p>
          <div className="max-h-44 space-y-1 overflow-y-auto pr-1 font-mono text-[11px]">
            {preview.tables.map((t: any) => (
              <div key={t.table} className="flex justify-between gap-3">
                <span className={t.recognized ? 'text-silver' : 'text-crimson'}>{t.recognized ? '✓' : '✗'} {t.table}</span>
                <span className="text-muted">{t.rows} rows</span>
              </div>
            ))}
          </div>
          {preview.unknown_tables?.length > 0 && (
            <p className="mt-2 text-[11px] text-amber-300">Unknown tables will be skipped: {preview.unknown_tables.join(', ')}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type RESTORE to confirm'
              className="w-44 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none"
            />
            <button
              onClick={runRestore}
              disabled={busy || confirmText !== 'RESTORE'}
              className="rounded-lg bg-crimson px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
            >
              Run restore (upsert only)
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-jade/30 bg-jade/10 p-4">
          <p className="mb-2 text-xs font-bold text-jade">Restore finished — {result.note}</p>
          <div className="max-h-44 space-y-1 overflow-y-auto pr-1 font-mono text-[11px]">
            {result.restored.map((r: any) => (
              <div key={r.table} className="flex justify-between gap-3">
                <span className="text-silver">{r.table}</span>
                <span className={r.status === 'ok' ? 'text-jade' : 'text-amber-300'}>{r.status}{r.upserted !== undefined ? ` (${r.upserted})` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('payment');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { setSettings(await apiFetch('/api/settings?all=1', { auth: true })); }
    catch { setSettings({}); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const val = (key: string, fallback: any) => settings[key] ?? fallback;
  const setKey = (key: string, v: any) => setSettings((s) => ({ ...s, [key]: v }));

  const save = async (key: string) => {
    setSaved(''); setError('');
    try {
      await apiFetch('/api/settings', { method: 'PUT', auth: true, body: { key, value: settings[key] } });
      setSaved(key);
      setTimeout(() => setSaved(''), 2500);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <Loader />;

  const SaveBtn = ({ k }: { k: string }) => (
    <div className="mt-5 flex items-center gap-3">
      <button onClick={() => save(k)}
        className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-ink hover:bg-gold-soft">
        <Save size={14} /> Save
      </button>
      {saved === k && <span className="inline-flex items-center gap-1.5 text-xs text-jade"><CheckCircle2 size={14} /> Saved — live immediately</span>}
      {error && <span className="text-xs text-crimson">{error}</span>}
    </div>
  );

  const payment = val('payment', { upi_id: '', payee_name: 'DJ SHAGGY', qr_url: '', instructions: '' });
  const whatsapp = val('whatsapp', { number: '', message: '' });
  const delivery = val('delivery', { note: '' });
  const site = val('site', { announcement: '', hero_title: '', hero_subtitle: '', about_short: '', about_long: '', support_email: '' });
  const seo = val('seo', { title: '', description: '', keywords: '', og_image: '' });
  const admin = val('admin', { emails: [] as string[] });

  return (
    <div>
      <AdminHeader title="Settings" sub="Payment, delivery, content and SEO — no code changes needed." />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cx('inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all',
              tab === t.id ? 'border-gold bg-gold/12 text-gold' : 'border-line text-muted hover:text-silver')}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl rounded-2xl border border-line bg-panel p-6">
        {tab === 'payment' && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold">Manual UPI payment</h2>
            <p className="text-xs leading-relaxed text-muted">
              Shown at checkout. The customer pays this UPI ID, submits their UTR + screenshot, and you verify the payment in your bank/UPI app before approving. A dynamic QR is generated automatically from the UPI ID — upload an image only if you want to override it.
            </p>
            <Field label="UPI ID (VPA)">
              <input className={inputCls} value={payment.upi_id}
                onChange={(e) => setKey('payment', { ...payment, upi_id: e.target.value.trim() })}
                placeholder="yourname@upi" />
            </Field>
            {(!payment.upi_id || payment.upi_id.trim().toLowerCase() === 'djshaggy@upi' || payment.upi_id.includes('example')) && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-200/90">
                The current UPI ID is a placeholder and payments to it will fail in customers\u2019 bank apps.
                Enter your real VPA (e.g. your number@okhdfcbank / @paytm / @ybl) \u2014 until then, checkout shows a
                \u201cpayment being configured\u201d notice instead of a broken QR.
              </p>
            )}
            <Field label="Payee name">
              <input className={inputCls} value={payment.payee_name}
                onChange={(e) => setKey('payment', { ...payment, payee_name: e.target.value })} />
            </Field>
            <Field label="Payment QR override (optional)" hint="Uploaded to secure storage; overrides the auto-generated QR at checkout.">
              <div className="flex items-center gap-3">
                {payment.qr_url && <img src={payment.qr_url} alt="Payment QR" className="h-20 w-20 rounded-lg border border-line bg-white object-contain p-1" />}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
                  <Upload size={14} /> Upload QR image
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const { url } = await uploadImage('artwork', f, true);
                      if (url) setKey('payment', { ...payment, qr_url: url });
                    }} />
                </label>
                {payment.qr_url && (
                  <button onClick={() => setKey('payment', { ...payment, qr_url: '' })} className="text-xs text-crimson hover:underline">Remove</button>
                )}
              </div>
            </Field>
            <Field label="Payment instructions shown at checkout">
              <textarea rows={4} className={inputCls} value={payment.instructions}
                onChange={(e) => setKey('payment', { ...payment, instructions: e.target.value })} />
            </Field>
            <SaveBtn k="payment" />
          </div>
        )}

        {tab === 'whatsapp' && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold">WhatsApp support button</h2>
            <p className="text-xs text-muted">Floating button on every public page. Uses a wa.me deep link — ready to be upgraded to the WhatsApp Business API later.</p>
            <Field label="WhatsApp number (country code + number, digits only)" hint="Example: 919067162771 \u2014 used for wa.me links sitewide">
              <input className={inputCls} value={whatsapp.number}
                onChange={(e) => setKey('whatsapp', { ...whatsapp, number: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="919067162771" />
            </Field>
            <Field label="Display format (shown to customers)">
              <input className={inputCls} value={whatsapp.display || ''}
                onChange={(e) => setKey('whatsapp', { ...whatsapp, display: e.target.value })}
                placeholder="+91 90671 62771" />
            </Field>
            <Field label="Default pre-filled message">
              <textarea rows={2} className={inputCls} value={whatsapp.message}
                onChange={(e) => setKey('whatsapp', { ...whatsapp, message: e.target.value })} />
            </Field>
            <SaveBtn k="whatsapp" />
          </div>
        )}

        {tab === 'delivery' && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold">Delivery settings</h2>
            <p className="text-xs leading-relaxed text-muted">
              Playlists are delivered via Google Drive links stored per product (Products → edit → Delivery link), emailed after you approve payment. This note is shown on product pages.
            </p>
            <Field label="Delivery note (public)">
              <textarea rows={3} className={inputCls} value={delivery.note}
                onChange={(e) => setKey('delivery', { note: e.target.value })} />
            </Field>
            <SaveBtn k="delivery" />
          </div>
        )}

        {tab === 'site' && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold">Website content</h2>
            <Field label="Announcement bar (top of site, blank to hide)">
              <input className={inputCls} value={site.announcement}
                onChange={(e) => setKey('site', { ...site, announcement: e.target.value })} />
            </Field>
            <Field label="Homepage hero title">
              <input className={inputCls} value={site.hero_title}
                onChange={(e) => setKey('site', { ...site, hero_title: e.target.value })} />
            </Field>
            <Field label="Homepage hero subtitle">
              <textarea rows={2} className={inputCls} value={site.hero_subtitle}
                onChange={(e) => setKey('site', { ...site, hero_subtitle: e.target.value })} />
            </Field>
            <Field label="About — short (footer, cards)">
              <textarea rows={2} className={inputCls} value={site.about_short}
                onChange={(e) => setKey('site', { ...site, about_short: e.target.value })} />
            </Field>
            <Field label="About — full (About page / homepage section)">
              <textarea rows={5} className={inputCls} value={site.about_long}
                onChange={(e) => setKey('site', { ...site, about_long: e.target.value })} />
            </Field>
            <Field label="Support email">
              <input type="email" className={inputCls} value={site.support_email}
                onChange={(e) => setKey('site', { ...site, support_email: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone \u2014 display" hint="Shown in footer, contact & checkout">
                <input className={inputCls} value={site.phone_display || ''}
                  onChange={(e) => setKey('site', { ...site, phone_display: e.target.value })}
                  placeholder="+91 90671 62771" />
              </Field>
              <Field label="Phone \u2014 tel: link" hint="Digits with country code, used by tap-to-call">
                <input className={inputCls} value={site.phone_tel || ''}
                  onChange={(e) => setKey('site', { ...site, phone_tel: e.target.value.replace(/[^0-9+]/g, '') })}
                  placeholder="+919067162771" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram profile URL">
                <input className={inputCls} value={site.instagram || ''}
                  onChange={(e) => setKey('site', { ...site, instagram: e.target.value })}
                  placeholder="https://www.instagram.com/itsdjshaggy/" />
              </Field>
              <Field label="Instagram handle">
                <input className={inputCls} value={site.instagram_handle || ''}
                  onChange={(e) => setKey('site', { ...site, instagram_handle: e.target.value })}
                  placeholder="@itsdjshaggy" />
              </Field>
              <Field label="Facebook URL">
                <input className={inputCls} value={site.facebook || ''}
                  onChange={(e) => setKey('site', { ...site, facebook: e.target.value })}
                  placeholder="https://fb.com/sagarshah" />
              </Field>
              <Field label="YouTube URL">
                <input className={inputCls} value={site.youtube || ''}
                  onChange={(e) => setKey('site', { ...site, youtube: e.target.value })}
                  placeholder="https://www.youtube.com/djshaggy" />
              </Field>
            </div>
            <Field label="Contact page intro line">
              <input className={inputCls} value={site.contact_intro || ''}
                onChange={(e) => setKey('site', { ...site, contact_intro: e.target.value })} />
            </Field>
            <Field label="Chat assistant avatar" hint="Used for the chat launcher and bubbles. Upload DJ SHAGGY's photo \u2014 never a stock face.">
              <div className="flex items-center gap-3">
                {site.chat_avatar_url && <img src={site.chat_avatar_url} alt="Chat avatar" className="h-14 w-14 rounded-full border border-gold/40 object-cover object-top" />}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
                  <Upload size={14} /> Upload photo
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const { url } = await uploadImage('artwork', f, true);
                      if (url) setKey('site', { ...site, chat_avatar_url: url });
                    }} />
                </label>
                {site.chat_avatar_url && site.chat_avatar_url !== '/artwork/artist-portrait.webp' && (
                  <button onClick={() => setKey('site', { ...site, chat_avatar_url: '/artwork/artist-portrait.webp' })}
                    className="text-xs text-gold hover:underline">Reset to official portrait</button>
                )}
              </div>
            </Field>
            <SaveBtn k="site" />
          </div>
        )}

        {tab === 'seo' && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold">SEO & Open Graph</h2>
            <Field label="Site title">
              <input className={inputCls} value={seo.title}
                onChange={(e) => setKey('seo', { ...seo, title: e.target.value })} />
            </Field>
            <Field label="Meta description">
              <textarea rows={3} className={inputCls} value={seo.description}
                onChange={(e) => setKey('seo', { ...seo, description: e.target.value })} />
            </Field>
            <Field label="Keywords (comma separated)">
              <input className={inputCls} value={seo.keywords}
                onChange={(e) => setKey('seo', { ...seo, keywords: e.target.value })} />
            </Field>
            <Field label="OG image URL" hint="Defaults to the DJ SHAGGY logo">
              <input className={inputCls} value={seo.og_image}
                onChange={(e) => setKey('seo', { ...seo, og_image: e.target.value })} />
            </Field>
            <Field label="Custom favicon" hint="Upload a square PNG/SVG \u2014 replaces the browser tab icon site-wide">
              <div className="flex items-center gap-3">
                <img src={seo.favicon_url || '/favicon.svg'} alt="Favicon preview" className="h-8 w-8 rounded border border-line bg-ink object-contain p-0.5" />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-silver hover:border-gold/50">
                  <Upload size={14} /> Upload favicon
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const { url } = await uploadImage('artwork', f, true);
                      if (url) setKey('seo', { ...seo, favicon_url: url });
                    }} />
                </label>
                {seo.favicon_url && (
                  <button onClick={() => setKey('seo', { ...seo, favicon_url: '' })} className="text-xs text-crimson hover:underline">Reset</button>
                )}
              </div>
            </Field>
            <SaveBtn k="seo" />
            <p className="text-[11px] leading-relaxed text-muted">
              Sitemap and robots.txt are served from <code>/sitemap.xml</code> and <code>/robots.txt</code>. Product pages add Product structured data automatically.
            </p>
          </div>
        )}

        {tab === 'general' && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold">General</h2>
            <Field label="Admin emails (one per line)" hint="Only these accounts can access the admin panel. Create accounts in Supabase Auth (or ask your developer).">
              <textarea rows={3} className={inputCls} value={(admin.emails || []).join('\n')}
                onChange={(e) => setKey('admin', { emails: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
            </Field>
            <SaveBtn k="admin" />
            <Field label="Database backup" hint="Downloads a JSON snapshot of every table (admin-only, rate-limited). Storage files remain in Supabase Storage and are referenced by URL.">
              <button
                onClick={async () => {
                  try {
                    const token = (await import('../../lib/supabase')).default;
                    const { data } = await token.auth.getSession();
                    const r = await fetch('/api/backup', { headers: { Authorization: `Bearer ${data.session?.access_token}` } });
                    if (!r.ok) throw new Error((await r.json()).error || 'Backup failed');
                    const blob = await r.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `djshaggy-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  } catch (e: any) { setError(e.message); }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-silver hover:border-gold/50 hover:text-gold"
              >
                <Save size={14} /> Download full backup (JSON)
              </button>
            </Field>
            <Field label="Restore from backup" hint="Step 1 validates and previews the file. Step 2 requires typing RESTORE and only upserts rows — nothing is deleted.">
              <RestoreTool onError={setError} />
            </Field>
            <div className="rounded-lg border border-line bg-ink p-4 text-[11px] leading-relaxed text-muted">
              <p className="font-bold text-silver">Environment-based integrations (set in Vercel → Environment Variables):</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 font-mono">
                <li>RESEND_API_KEY / RESEND_FROM — order & delivery emails</li>
                <li>GOOGLE_DRIVE_FOLDER_ID + GOOGLE_DRIVE_API_KEY or GOOGLE_SERVICE_ACCOUNT_JSON — Drive import</li>
                <li>AI_API_KEY (+ AI_API_BASE / AI_MODEL) — GPT-powered chat (falls back to built-in catalogue assistant)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
