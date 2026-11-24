import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSEO } from '../hooks/useSEO';
import Logo from '../components/Logo';

export default function AdminLogin() {
  useSEO('Admin Login');
  const navigate = useNavigate();
  const { recheckAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) throw new Error('Invalid email or password');
      const ok = await recheckAdmin();
      if (!ok) {
        await supabase.auth.signOut();
        throw new Error('This account does not have admin access.');
      }
      navigate('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo height="h-16" to="/" /></div>
        <form onSubmit={submit} className="rounded-2xl border border-line bg-panel p-7">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck size={17} className="text-gold" />
            <h1 className="font-display text-lg font-bold">Admin Access</h1>
          </div>
          <p className="mb-6 text-xs text-muted">Restricted area — authorised accounts only.</p>

          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Email</label>
          <div className="relative mb-4">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@djshaggy.com"
              className="w-full rounded-xl border border-line bg-ink py-3 pl-10 pr-4 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none"
            />
          </div>

          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Password</label>
          <div className="relative mb-5">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-line bg-ink py-3 pl-10 pr-4 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none"
            />
          </div>

          {error && <p className="mb-4 rounded-lg border border-crimson/30 bg-crimson/10 px-3.5 py-2.5 text-xs text-crimson">{error}</p>}

          <button
            type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-sm font-bold text-ink transition-all hover:bg-gold-soft active:scale-[0.98] disabled:opacity-50"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? 'Verifying…' : 'Sign in to dashboard'}
          </button>
        </form>
        <Link to="/" className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted hover:text-gold">
          <ArrowLeft size={13} /> Back to store
        </Link>
      </div>
    </div>
  );
}
