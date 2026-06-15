import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";

const STORAGE_KEY = "sensor:token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [email, setEmail] = useState<string | null>(() => {
    const t = localStorage.getItem(STORAGE_KEY);
    try {
      if (!t) return null;
      const payload = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload?.email ?? null;
    } catch {
      return null;
    }
  });
  const [lojaId, setLojaId] = useState<number | null>(() => {
    const t = localStorage.getItem(STORAGE_KEY);
    try {
      if (!t) return null;
      const payload = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload?.lojaId ?? null;
    } catch {
      return null;
    }
  });

  const login = useCallback((nextToken: string) => {
    localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
    try {
      const payload = JSON.parse(atob(nextToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      setEmail(payload?.email ?? null);
      setLojaId(payload?.lojaId ?? null);
    } catch {
      setEmail(null);
      setLojaId(null);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setEmail(null);
    setLojaId(null);
  }, []);

  const value = useMemo(() => ({ token, login, logout, lojaId, email }), [token, login, logout, lojaId, email]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
