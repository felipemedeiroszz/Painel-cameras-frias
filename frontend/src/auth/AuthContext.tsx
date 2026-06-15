import { createContext, useContext } from "react";

export type AuthState = {
  token: string | null;
  lojaId: number | null;
  email: string | null;
};

export type AuthContextValue = AuthState & {
  login: (token: string) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext not found");
  return ctx;
}
