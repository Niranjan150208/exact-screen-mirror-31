import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  displayName: string;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  isAdmin: false,
  loading: true,
  displayName: "",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (active) setIsAdmin((data ?? []).some((row) => row.role === "admin"));
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo<AuthValue>(() => {
    const user = session?.user ?? null;
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    return {
      session,
      user,
      isAdmin,
      loading,
      displayName: meta.full_name || meta.name || user?.email?.split("@")[0] || "",
    };
  }, [session, isAdmin, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
