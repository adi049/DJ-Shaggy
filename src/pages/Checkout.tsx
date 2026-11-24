import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Copy, Check, Upload, ShieldCheck,
  AlertTriangle, BadgeCheck, Loader2, Smartphone,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useSEO } from '../hooks/useSEO';
import { apiFetch, uploadImage } from '../lib/api';
import { PageHeader, EmptyState } from '../components/UI';
import QrCode from '../components/QrCode';
import { inr, isPlaceholderUpi } from '../lib/utils';

interface DiscountState { code: string; discount: number }

export default function Checkout() {
  useSEO('Checkout');
  const cart = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const navDiscount = (location.state as any)?.discount as DiscountState | undefined;

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: '', email: '', confirmEmail: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<{ id: string; amount: number } | null>(null);
  const [utr, setUtr] = useState('');
  const [shot, setShot] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const discount = navDiscount?.discount || 0;
  const total = useMemo(() => Math.max(0, cart.subtotal - discount), [cart.subtotal, discount]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.confirmEmail.trim().toLowerCase() !== form.email.trim().toLowerCase() || !form.confirmEmail.trim())
      e.confirmEmail = 'Email addresses do not match';
    if (!/^[+]?[0-9\s-]{8,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) return;
    setBusy(true); setSubmitErr('');
    try {
      const res = await apiFetch<{ id: string; amount: number }>('/api/orders', {
        method: 'POST',
        body: {
          customer_name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          items: cart.items.map((i) => ({ type: i.type, id: i.id })),
          discount_code: navDiscount?.code,
        },
      });
      setOrder(res);
      setStep(2);
    } catch (e: any) {
      setSubmitErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async () => {
    if (!order) return;
    if (utr.trim() && utr.trim().length < 6) {
      setSubmitErr('If you enter a UTR, it must be at least 6 characters.');
      return;
    }
    if (!utr.trim() && !shot) {
      setSubmitErr('Please add your UTR or a payment screenshot \u2014 at least one helps us verify you faster.');
      return;
    }
    setBusy(true); setSubmitErr('');
    try {
      let screenshot_path: string | undefined;
      if (shot) {
        const up = await uploadImage('payment', shot);
        screenshot_path = up.path;
      }
      await apiFetch('/api/orders', {
        method: 'PUT',
        body: { id: order.id, email: form.email.trim(), action: 'submit_payment', utr: utr.trim() || undefined, screenshot_path },
      });
      sessionStorage.setItem('djs_last_order', JSON.stringify({ id: order.id, email: form.email.trim() }));
      cart.clear();
      navigate(`/order/${order.id}`);
    } catch (e: any) {
      setSubmitErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (cart.items.length === 0 && !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <EmptyState
          title="Your cart is empty"
          sub="Add some playlists before checking out."
          action={<Link to="/catalogue" className="mt-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-ink">Browse catalogue</Link>}
        />
      </div>
    );
  }

  const { payment } = settings;
  const upiUrl = order
    ? `upi://pay?pa=${payment.upi_id}&pn=${encodeURIComponent(payment.payee_name)}&am=${order.amount}&cu=INR&tn=${encodeURIComponent(order.id)}`
    : '';

  return (
    <div>
      <PageHeader eyebrow="Almost there" title="Checkout" sub="Manual UPI payment — verified by our team before delivery. No card details, no gateway." />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Stepper */}
        <div className="mb-10 flex items-center justify-center gap-3 text-xs font-semibold">
          <StepDot n={1} label="Your details" active={step === 1} done={step > 1} />
          <div className="h-px w-10 bg-line sm:w-16" />
          <StepDot n={2} label="Pay & submit UTR" active={step === 2} done={false} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
                <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
                  <h2 className="font-display text-lg font-bold">Contact details</h2>
                  <p className="mt-1 text-xs text-muted">Playlists are delivered to this email after payment verification.</p>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Full name</label>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Your name"
                        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
                      {errors.name && <p className="mt-1 text-[11px] text-crimson">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Email</label>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com" autoComplete="email"
                        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
                      {errors.email && <p className="mt-1 text-[11px] text-crimson">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Confirm email</label>
                      <input type="email" value={form.confirmEmail} onChange={(e) => setForm({ ...form, confirmEmail: e.target.value })}
                        placeholder="Re-enter your email" autoComplete="email"
                        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
                      {errors.confirmEmail && <p className="mt-1 text-[11px] text-crimson">{errors.confirmEmail}</p>}
                      <p className="mt-1 text-[11px] text-muted/70">Playlists are delivered here — please double-check it matches.</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Phone / WhatsApp</label>
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
                      {errors.phone && <p className="mt-1 text-[11px] text-crimson">{errors.phone}</p>}
                    </div>
                  </div>
                  {submitErr && <p className="mt-4 rounded-lg border border-crimson/30 bg-crimson/10 px-3.5 py-2.5 text-xs text-crimson">{submitErr}</p>}
                  <button
                    onClick={placeOrder}
                    disabled={busy}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-display text-sm font-bold text-ink transition-all hover:bg-gold-soft active:scale-[0.98] disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                    {busy ? 'Creating order…' : `Place order • ${inr(total)}`} {!busy && <ArrowRight size={16} />}
                  </button>
                </div>

                <OrderSummary items={cart.items} subtotal={cart.subtotal} discount={discount} total={total} code={navDiscount?.code} />
              </div>
            </motion.div>
          )}

          {step === 2 && order && order.amount === 0 && (
            <motion.div key="s2free" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
              className="mx-auto max-w-lg">
              <div className="rounded-2xl border border-jade/30 bg-panel p-8 text-center">
                <BadgeCheck size={44} className="mx-auto text-jade" />
                <h2 className="mt-4 font-display text-2xl font-bold">Order {order.id} placed — free with your coupon</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  No payment needed. Your order is queued for a quick manual review, and your playlist links
                  will be emailed to you right after approval. Track it anytime with your Order ID and email.
                </p>
                <button
                  onClick={() => {
                    sessionStorage.setItem('djs_last_order', JSON.stringify({ id: order.id, email: form.email.trim() }));
                    cart.clear();
                    navigate(`/order/${order.id}`);
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 font-display text-sm font-bold text-ink transition-all hover:bg-gold-soft active:scale-95"
                >
                  View order <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && order && order.amount > 0 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
                <div className="space-y-6">
                  {/* Payment instructions */}
                  <div className="rounded-2xl border border-gold/30 bg-panel p-6 sm:p-8">
                    <div className="flex items-center gap-2.5">
                      <BadgeCheck size={20} className="text-jade" />
                      <div>
                        <h2 className="font-display text-lg font-bold">Order {order.id} created</h2>
                        <p className="text-xs text-muted">Status: Pending Verification — complete payment below</p>
                      </div>
                    </div>

                    {/* Mobile: one-tap deep link into any installed UPI app with exact amount.
                        Desktop keeps the QR flow. Never auto-verifies — manual checks stay. */}
                    {!isPlaceholderUpi(payment.upi_id) && (
                      <div className="mt-6 sm:hidden">
                        <a
                          href={upiUrl}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-jade py-4 font-display text-base font-bold text-ink transition-transform active:scale-[0.98]"
                        >
                          <Smartphone size={19} /> Pay {inr(order.amount)} via UPI app
                        </a>
                        <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">
                          Opens your installed UPI app (GPay, PhonePe, Paytm, BHIM…) with the exact amount filled in.
                          No app? Scan the QR below with another phone, or pay to the UPI ID manually.
                        </p>
                      </div>
                    )}
                    <div className="mt-6 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
                      <div className="flex justify-center">
                        {payment.qr_url ? (
                          <img src={payment.qr_url} alt="UPI payment QR" className="w-48 rounded-xl border border-gold/40 bg-white p-2" />
                        ) : isPlaceholderUpi(payment.upi_id) ? (
                          <div className="w-56 rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center">
                            <AlertTriangle size={22} className="mx-auto text-amber-300" />
                            <p className="mt-2 text-[11px] leading-relaxed text-amber-200/90">
                              Payment QR is being configured. Pay manually to the UPI ID shown, or{' '}
                              <a className="font-semibold text-jade" target="_blank" rel="noreferrer"
                                href={`https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(`Hi! I want to pay for order ${order.id} (${inr(order.amount)})`)}`}>
                                WhatsApp us
                              </a>{' '}
                              for the payment link.
                            </p>
                          </div>
                        ) : (
                          <QrCode text={upiUrl} size={232} />
                        )}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Pay exactly</p>
                          <p className="font-display text-3xl font-bold gold-text">{inr(order.amount)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">UPI ID</p>
                          <div className="mt-1 flex items-center gap-2">
                            <code className="rounded-lg border border-line bg-ink px-3 py-2 text-sm font-semibold text-gold-soft">{payment.upi_id}</code>
                            <button
                              onClick={() => { navigator.clipboard.writeText(payment.upi_id); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                              className="rounded-lg border border-line p-2 text-muted hover:border-gold/50 hover:text-gold"
                              aria-label="Copy UPI ID"
                            >
                              {copied ? <Check size={15} className="text-jade" /> : <Copy size={15} />}
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-muted">Payee: {payment.payee_name}</p>
                        </div>
                        {payment.instructions && (
                          <p className="rounded-lg border border-line bg-ink/60 p-3 text-xs leading-relaxed text-muted">
                            {payment.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit proof */}
                  <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
                    <h3 className="font-display text-base font-bold">Submit payment proof</h3>
                    <p className="mt-1 text-xs text-muted">
                      After paying, enter the UTR / transaction reference from your UPI app. A screenshot speeds up verification.
                    </p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">UTR / Transaction reference <span className="normal-case text-muted/70">(optional but recommended)</span></label>
                        <input
                          value={utr}
                          onChange={(e) => setUtr(e.target.value)}
                          placeholder="e.g. 432187659012 — from your UPI app"
                          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none"
                          maxLength={40}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Payment screenshot (optional)</label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-ink px-4 py-4 text-sm text-muted transition-colors hover:border-gold/50">
                          <Upload size={17} className="text-gold" />
                          {shot ? <span className="text-silver">{shot.name}</span> : 'Upload screenshot (PNG/JPG, max 6 MB)'}
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                            onChange={(e) => setShot(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                      <div className="flex items-start gap-2.5 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3.5 text-[11px] leading-relaxed text-amber-200/80">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300" />
                        Payments are verified manually in our bank/UPI app. Screenshots and UTRs alone never trigger delivery — please pay first, then submit.
                      </div>
                      {submitErr && <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-3.5 py-2.5 text-xs text-crimson">{submitErr}</p>}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={submitPayment}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 font-display text-sm font-bold text-ink transition-all hover:bg-gold-soft active:scale-95 disabled:opacity-50"
                        >
                          {busy && <Loader2 size={15} className="animate-spin" />}
                          {busy ? 'Submitting…' : 'Submit payment details'}
                        </button>
                        <button
                          onClick={() => setStep(1)}
                          className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3.5 text-sm font-semibold text-muted hover:text-silver"
                        >
                          <ArrowLeft size={15} /> Back
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <OrderSummary items={cart.items} subtotal={cart.subtotal} discount={discount} total={order.amount} code={navDiscount?.code} />
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-panel p-4 text-[11px] leading-relaxed text-muted">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0 text-jade" />
                    Your payment details and screenshot are stored securely and are only visible to the admin team.
                  </div>
                  <div className="mt-4 rounded-xl border border-line bg-panel p-4 text-[11px] leading-relaxed text-muted">
                    <p className="font-bold text-silver">Trouble paying?</p>
                    <p className="mt-1">
                      WhatsApp{' '}
                      <a className="font-semibold text-jade" target="_blank" rel="noreferrer"
                        href={`https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(`Hi! I need help paying for my order (${inr(order.amount)})`)}`}>
                        {settings.whatsapp.display || settings.site.phone_display}
                      </a>{' '}
                      • Call{' '}
                      <a className="font-semibold text-gold" href={`tel:${settings.site.phone_tel}`}>{settings.site.phone_display}</a>
                      {' '}•{' '}
                      <a className="font-semibold text-azure" href={`mailto:${settings.site.support_email}`}>Email us</a>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${
        done ? 'border-jade bg-jade/15 text-jade' : active ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'
      }`}>
        {done ? <Check size={13} /> : n}
      </span>
      <span className={active ? 'text-silver' : 'text-muted'}>{label}</span>
    </div>
  );
}

function OrderSummary({ items, subtotal, discount, total, code }: {
  items: { key: string; name: string; price: number; artwork_url: string; type: string }[];
  subtotal: number; discount: number; total: number; code?: string;
}) {
  return (
    <div className="h-fit rounded-2xl border border-line bg-panel p-6">
      <h3 className="font-display text-base font-bold">Order summary</h3>
      <ul className="mt-4 space-y-3">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-3">
            {i.artwork_url
              ? <img src={i.artwork_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              : <span className="h-10 w-10 rounded-lg bg-panel2" />}
            <span className="min-w-0 flex-1 truncate text-xs text-silver">{i.name}</span>
            <span className="text-xs font-semibold text-gold">{inr(i.price)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd>{inr(subtotal)}</dd></div>
        {discount > 0 && (
          <div className="flex justify-between text-jade"><dt>Discount {code && `(${code})`}</dt><dd>-{inr(discount)}</dd></div>
        )}
        <div className="flex justify-between border-t border-line pt-3 font-display text-base font-bold">
          <dt>Total</dt><dd className="text-gold">{inr(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
