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
      return res.ok;
    } catch { return false; }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      const admin = await checkAdmin(data.session);
      setIsAdmin(admin);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      setIsAdmin(await checkAdmin(s));
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
