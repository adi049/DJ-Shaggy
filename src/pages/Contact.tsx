import { useState } from 'react';
import { Mail, MessageCircle, Send, CheckCircle2, HelpCircle, Phone, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { useSEO } from '../hooks/useSEO';
import { PageHeader } from '../components/UI';
import Reveal from '../components/Reveal';

export default function Contact() {
  const { settings } = useSettings();
  useSEO('Contact & Support', 'Get help with DJ SHAGGY orders, playlists, payment verification or anything else.');

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email and message.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/api/messages', { method: 'POST', body: form });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Could not send your message. Please try WhatsApp instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="We reply fast"
        title="Contact & Support"
        sub={settings.site.contact_intro || 'Order help, playlist questions, custom pack requests — reach us any way you like.'}
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
          <Reveal>
            <div className="space-y-4">
              <a
                href={`https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(settings.whatsapp.message)}`}
                target="_blank" rel="noreferrer"
                className="card-hover flex items-center gap-4 rounded-2xl border border-line bg-panel p-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-jade/15 text-jade">
                  <MessageCircle size={20} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-silver">WhatsApp</span>
                  <span className="text-xs text-muted">{settings.whatsapp.display || settings.site.phone_display} • fastest for order & payment questions</span>
                </span>
              </a>
              <a
                href={`tel:${settings.site.phone_tel}`}
                className="card-hover flex items-center gap-4 rounded-2xl border border-line bg-panel p-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <Phone size={20} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-silver">Call us</span>
                  <span className="text-xs text-muted">{settings.site.phone_display} • tap to call</span>
                </span>
              </a>
              <a
                href={settings.site.instagram}
                target="_blank" rel="noreferrer"
                className="card-hover flex items-center gap-4 rounded-2xl border border-line bg-panel p-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-magenta/15 text-magenta">
                  <Instagram size={20} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-silver">Instagram</span>
                  <span className="text-xs text-muted">{settings.site.instagram_handle} • drops, gigs & behind-the-scenes</span>
                </span>
              </a>
              <a
                href={`mailto:${settings.site.support_email}`}
                className="card-hover flex items-center gap-4 rounded-2xl border border-line bg-panel p-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-azure/15 text-azure">
                  <Mail size={20} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-silver">Email</span>
                  <span className="text-xs text-muted">{settings.site.support_email}</span>
                </span>
              </a>
              <Link to="/faq" className="card-hover flex items-center gap-4 rounded-2xl border border-line bg-panel p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <HelpCircle size={20} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-silver">FAQ</span>
                  <span className="text-xs text-muted">Instant answers to common questions</span>
                </span>
              </Link>
              <div className="rounded-2xl border border-line bg-panel p-5 text-xs leading-relaxed text-muted">
                <p className="font-bold text-silver">Order support tip</p>
                <p className="mt-1">For anything about an existing order, keep your Order ID (starts with DJS-) and the email used at checkout ready.</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
              {done ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <CheckCircle2 size={44} className="text-jade" />
                  <h2 className="font-display text-xl font-bold">Message sent</h2>
                  <p className="max-w-sm text-sm text-muted">
                    Thanks for reaching out — the team will get back to you on your email shortly.
                  </p>
                  <button onClick={() => { setDone(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    className="mt-2 text-xs font-semibold text-gold hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h2 className="font-display text-lg font-bold">Send us a message</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Your name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Full name" />
                    <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" />
                  </div>
                  <Field label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="e.g. Question about order DJS-XXXX" />
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Message</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={5}
                      placeholder="How can we help?"
                      className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none"
                    />
                  </div>
                  {error && <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-3.5 py-2.5 text-xs text-crimson">{error}</p>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-ink transition-all hover:bg-gold-soft active:scale-95 disabled:opacity-50"
                  >
                    <Send size={15} /> {busy ? 'Sending…' : 'Send message'}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none"
      />
    </div>
  );
}
