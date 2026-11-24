import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, Lock, LogOut, Package, KeyRound, ArrowLeft,
  Loader2, CheckCircle2, Phone, ExternalLink,
} from 'lucide-react';
import supabase from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';
import { PageHeader, StatusPill, Loader } from '../components/UI';
import { fmtDate, inr } from '../lib/utils';

type OrderRow = {
  id: string; amount: number; payment_status: string; delivery_status: string;
  created_at: string; delivered_at: string | null;
  items: { name: string; price: number; link?: string }[];
};

export default function Account() {
  useSEO('My Account', 'Sign in to view your DJ SHAGGY orders and downloads.');
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(undefined); // undefined = loading
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    // Password-recovery link lands here with a recovery session.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get('type') === 'recovery') setMode('reset');
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setOrdersLoading(true);
    fetch('/api/my-orders', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [session]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(error.message);
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw new Error(error.message);
        setMsg({ ok: true, text: 'Account created. If email confirmation is enabled, check your inbox to verify your address — then sign in.' });
        setMode('signin');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/account`,
        });
        if (error) throw new Error(error.message);
        setMsg({ ok: true, text: 'If that email has an account, a password-reset link is on its way.' });
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(error.message);
        setMsg({ ok: true, text: 'Password updated. You are signed in.' });
        setMode('signin');
        navigate('/account', { replace: true });
      }
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (session === undefined) return <Loader label="Loading account…" />;

  /* ---------------- Authenticated view ---------------- */
  if (session) {
    const user = session.user;
    return (
      <div>
        <PageHeader eyebrow="Your account" title={`Hi, ${user.user_metadata?.full_name || 'DJ'}`} sub={user.email} />
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-gold"><User size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-silver">{user.email}</p>
              <p className="text-[11px] text-muted">
                {user.email_confirmed_at ? 'Email verified' : 'Email not verified yet'} · member since {fmtDate(user.created_at)}
              </p>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); setOrders([]); }}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-muted hover:border-crimson/50 hover:text-crimson"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>

          <h2 className="mb-4 font-display text-lg font-bold">Your orders</h2>
          {ordersLoading ? <Loader label="Loading orders…" /> : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-panel/50 p-10 text-center">
              <Package size={28} className="mx-auto text-muted" />
              <p className="mt-3 text-sm text-muted">No orders on <span className="text-silver">{user.email}</span> yet.</p>
              <Link to="/catalogue" className="mt-4 inline-block rounded-lg bg-gold px-5 py-2.5 text-xs font-bold text-ink">Browse playlists</Link>
              <p className="mt-3 text-[11px] text-muted">Ordered with a different email? Use <Link to="/track" className="text-gold hover:underline">Track Order</Link>.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="rounded-2xl border border-line bg-panel p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-bold text-gold">{o.id}</span>
                    <span className="text-[11px] text-muted">{fmtDate(o.created_at)}</span>
                    <span className="ml-auto text-sm font-bold text-gold">{inr(o.amount)}</span>
                    <StatusPill status={o.delivery_status === 'delivered' ? 'Delivered' : o.payment_status === 'pending_verification' ? 'Pending Verification' : o.payment_status === 'verified' ? 'Verified' : o.payment_status} />
                  </div>
                  <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-silver">{it.name}</span>
                        {o.delivery_status === 'delivered' && it.link && (
                          <a href={it.link} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-jade px-3 py-1.5 text-[11px] font-bold text-ink">
                            <ExternalLink size={11} /> Open
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  /* ---------------- Auth forms ---------------- */
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-2xl border border-line bg-panel p-7">
        <div className="mb-1 flex items-center gap-2">
          {mode === 'reset' ? <KeyRound size={17} className="text-gold" /> : <User size={17} className="text-gold" />}
          <h1 className="font-display text-lg font-bold">
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'forgot' && 'Reset password'}
            {mode === 'reset' && 'Choose a new password'}
          </h1>
        </div>
        <p className="mb-6 text-xs text-muted">
          {mode === 'forgot' || mode === 'reset'
            ? 'We\u2019ll email you a secure link.'
            : 'View your orders and re-download delivered playlists anytime.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
            </div>
          )}
          {mode !== 'reset' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full rounded-xl border border-line bg-ink py-3 pl-10 pr-4 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
              </div>
            </div>
          )}
          {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                {mode === 'reset' ? 'New password' : 'Password'}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters"
                  className="w-full rounded-xl border border-line bg-ink py-3 pl-10 pr-4 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none" />
              </div>
            </div>
          )}

          {msg && (
            <p className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${msg.ok ? 'border-jade/30 bg-jade/10 text-jade' : 'border-crimson/30 bg-crimson/10 text-crimson'}`}>
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> {msg.text}
            </p>
          )}

          <button type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-sm font-bold text-ink transition-all hover:bg-gold-soft active:scale-[0.98] disabled:opacity-50">
            {busy && <Loader2 size={15} className="animate-spin" />}
            {mode === 'signin' && (busy ? 'Signing in…' : 'Sign in')}
            {mode === 'signup' && (busy ? 'Creating…' : 'Create account')}
            {mode === 'forgot' && (busy ? 'Sending…' : 'Email me a reset link')}
            {mode === 'reset' && (busy ? 'Updating…' : 'Update password')}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-xs">
          {mode === 'signin' && (
            <>
              <button onClick={() => { setMode('forgot'); setMsg(null); }} className="block w-full text-muted hover:text-gold">Forgot password?</button>
              <p className="text-muted">New here?{' '}
                <button onClick={() => { setMode('signup'); setMsg(null); }} className="font-semibold text-gold hover:underline">Create an account</button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p className="text-muted">Have an account?{' '}
              <button onClick={() => { setMode('signin'); setMsg(null); }} className="font-semibold text-gold hover:underline">Sign in</button>
            </p>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <button onClick={() => { setMode('signin'); setMsg(null); }} className="inline-flex items-center gap-1.5 text-muted hover:text-gold">
              <ArrowLeft size={13} /> Back to sign in
            </button>
          )}
        </div>
      </motion.div>
      <p className="mt-4 flex items-center gap-1.5 text-center text-[11px] text-muted">
        <Phone size={11} /> Ordering without an account also works — track via <Link to="/track" className="text-gold hover:underline">Order ID + email</Link>.
      </p>
    </div>
  );
}
