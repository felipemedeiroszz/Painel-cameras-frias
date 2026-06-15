import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiLogin } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card } from "../ui/Card";
import { ApiError } from "../lib/http";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@sensor.local");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiLogin(email, password);
      login(result.token);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Falha no login (${err.status}).`);
      } else {
        setError("Falha no login.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_45%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-950" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
            <span className="text-base font-black tracking-tight">PC</span>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            Painel Câmaras Paulista
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Entre para acompanhar temperatura, porta e snapshots por evento.
          </div>
        </div>

        <Card>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">E-mail</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Senha</div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">{error}</div> : null}
            <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
