import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { client, getToken, setToken, type Role, type User } from "../api/client";
import { supabase, supabaseConfigured } from "../lib/supabase";

const ROLE_KEY = "pramana_oauth_role";
const DEPT_KEY = "pramana_oauth_dept";

export type OAuthProvider = "google" | "github";

interface AuthState {
  user: User | null;
  loading: boolean;
  loginWithOAuth: (provider: OAuthProvider, role: Role, dept?: string) => Promise<void>;
  completeOAuthSession: (role?: Role) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: {
    displayName?: string;
    username?: string;
    password?: string;
    dept?: string;
  }) => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await client.me();
      setUser(user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginWithOAuth = useCallback(
    async (provider: OAuthProvider, role: Role, dept = "engineering") => {
      if (!supabaseConfigured) {
        throw new Error("Supabase is not configured");
      }
      localStorage.setItem(ROLE_KEY, role);
      localStorage.setItem(DEPT_KEY, dept);
      // Must NOT be under /auth/* — Vite proxies /auth to the Express API
      const redirectTo = `${window.location.origin}/oauth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams:
            provider === "google"
              ? { access_type: "offline", prompt: "consent" }
              : undefined,
        },
      });
      if (error) throw new Error(error.message);
    },
    [],
  );

  const completeOAuthSession = useCallback(async (roleOverride?: Role) => {
    if (!supabaseConfigured) {
      throw new Error("Supabase is not configured");
    }

    // PKCE: exchange ?code= if present and no session yet
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    let session = (await supabase.auth.getSession()).data.session;
    if (code && !session?.access_token) {
      const { data: ex, error: exErr } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exErr) throw new Error(exErr.message);
      session = ex.session;
    }

    if (!session?.access_token) {
      // Wait briefly for hash-based tokens / auto detectSessionInUrl
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 100));
        session = (await supabase.auth.getSession()).data.session;
        if (session?.access_token) break;
      }
    }

    const accessToken = session?.access_token;
    const sbUser = session?.user;
    if (!accessToken || !sbUser) {
      throw new Error("No Supabase session after OAuth — try again");
    }

    const savedRole = (localStorage.getItem(ROLE_KEY) || "employee") as Role;
    const role = roleOverride || savedRole;
    const dept = localStorage.getItem(DEPT_KEY) || "engineering";
    const displayName =
      (typeof sbUser.user_metadata?.full_name === "string" &&
        sbUser.user_metadata.full_name) ||
      (typeof sbUser.user_metadata?.name === "string" &&
        sbUser.user_metadata.name) ||
      (sbUser.email ? sbUser.email.split("@")[0] : "User");
    const username = (sbUser.email || displayName || sbUser.id).slice(0, 80);

    const { token, user: next } = await client.supabaseBridge({
      accessToken,
      role,
      displayName,
      dept,
      username,
      mode: "login",
    });
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(DEPT_KEY);
    setToken(token);
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (input: {
      displayName?: string;
      username?: string;
      password?: string;
      dept?: string;
    }) => {
      const { user: next } = await client.updateMe(input);
      setUser(next);
    },
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refresh,
      loginWithOAuth,
      completeOAuthSession,
      logout,
      updateProfile,
    }),
    [
      user,
      loading,
      refresh,
      loginWithOAuth,
      completeOAuthSession,
      logout,
      updateProfile,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
