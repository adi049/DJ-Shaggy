import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import supabase from '../lib/supabase';

interface AuthCtx {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  recheckAdmin: () => Promise<boolean>;
}

const Ctx = createContext<AuthCtx>({
  session: null, isAdmin: false, loading: true,
  signOut: async () => {}, recheckAdmin: async () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (s: Session | null): Promise<boolean> => {
    if (!s) return false;
    try {
      const res = await fetch('/api/settings?all=1', {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      if (res.status >= 500) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || `Admin API failed (${res.status}). Check server environment and logs.`);
      }
      return res.ok;
    } catch (error) {
      if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
      throw new Error('Cannot reach the admin API. Start the Node API server and check its environment variables.');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      let admin = false;
      try { admin = await checkAdmin(data.session); } catch (error) { console.error('Admin verification failed:', error); }
      setIsAdmin(admin);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      try { setIsAdmin(await checkAdmin(s)); } catch (error) { console.error('Admin verification failed:', error); setIsAdmin(false); }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      session,
      isAdmin,
      loading,
      signOut: async () => { await supabase.auth.signOut(); setIsAdmin(false); },
      recheckAdmin: async () => {
        const { data } = await supabase.auth.getSession();
        const ok = await checkAdmin(data.session);
        setIsAdmin(ok);
        return ok;
      },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
