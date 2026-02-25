import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AuthSession,
  canCurrentUserLogin,
  clearSession,
  getCurrentUser,
  isMasterAdmin,
  readSession,
  saveSession,
  signInWithPassword,
  signOut as apiSignOut,
  getSupabaseConfigured,
} from "@/lib/supabaseRest";
import { useAppStore } from "@/store/appStore";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  configured: boolean;
  isMaster: boolean;
  accessAllowed: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);
  const [accessAllowed, setAccessAllowed] = useState(true);
  const configured = getSupabaseConfigured();
  const { hydrateFromRemote, resetLocalData } = useAppStore();

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        if (!configured) {
          return;
        }
        const stored = readSession();
        if (!stored) {
          return;
        }
        const user = await getCurrentUser();
        if (!mounted) return;
        if (!user) {
          clearSession();
          setSession(null);
          return;
        }
        const nextSession: AuthSession = { ...stored, user };
        saveSession(nextSession);
        setSession(nextSession);
        const master = await isMasterAdmin();
        const allowed = master ? true : await canCurrentUserLogin();
        setIsMaster(master);
        setAccessAllowed(allowed);
        await hydrateFromRemote();
      } catch (error) {
        console.error("Falha ao inicializar sessão:", error);
        clearSession();
        setSession(null);
        setIsMaster(false);
        setAccessAllowed(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    boot();
    return () => {
      mounted = false;
    };
  }, [configured, hydrateFromRemote]);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextSession = await signInWithPassword(email, password);
    setSession(nextSession);
    const master = await isMasterAdmin();
    const allowed = master ? true : await canCurrentUserLogin();
    setIsMaster(master);
    setAccessAllowed(allowed);
    await hydrateFromRemote();
  }, [hydrateFromRemote]);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setSession(null);
    setIsMaster(false);
    setAccessAllowed(true);
    resetLocalData();
  }, [resetLocalData]);

  const value = useMemo(
    () => ({
      session,
      loading,
      configured,
      isMaster,
      accessAllowed,
      signIn,
      signOut,
    }),
    [session, loading, configured, isMaster, accessAllowed, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
