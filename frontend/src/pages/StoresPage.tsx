import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthContext";
import { apiCreateLoja, apiGetLojas, apiUpdateLojaCredentials } from "../lib/api";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Page } from "../ui/Page";

export function StoresPage() {
  const { token, lojaId } = useAuth();
  const qc = useQueryClient();
  const isAdmin = lojaId === null;

  const lojasQ = useQuery({
    queryKey: ["lojas"],
    queryFn: () => apiGetLojas(token!),
    enabled: Boolean(token)
  });

  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("SP");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");

  const createM = useMutation({
    mutationFn: () => apiCreateLoja(token!, { nome, cidade, estado, email, password }),
    onSuccess: async () => {
      setNome("");
      setCidade("");
      setEstado("SP");
      setEmail("");
      setPassword("");
      await qc.invalidateQueries({ queryKey: ["lojas"] });
    }
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const resetM = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("missing_loja");
      return apiUpdateLojaCredentials(token!, editingId, {
        email: editEmail ? editEmail : undefined,
        password: editPassword ? editPassword : undefined
      });
    },
    onSuccess: async () => {
      setEditingId(null);
      setEditPassword("");
      await qc.invalidateQueries({ queryKey: ["lojas"] });
    }
  });

  const filtered = useMemo(() => {
    const list = lojasQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((l) => `${l.nome} ${l.cidade} ${l.estado}`.toLowerCase().includes(q));
  }, [lojasQ.data, search]);

  return (
    <Page title="Lojas" subtitle="Cadastre e gerencie credenciais de acesso por loja.">

      {isAdmin ? (
        <Card title="Cadastro de loja + credenciais">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
            <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            <Input placeholder="UF (ex: SP)" value={estado} onChange={(e) => setEstado(e.target.value)} />
            <Input placeholder="E-mail da loja" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Senha da loja" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button
              className="bg-ok-600 hover:bg-ok-500"
              disabled={!nome || !cidade || estado.trim().length !== 2 || !email || password.length < 6 || createM.isPending}
              onClick={() => createM.mutate()}
            >
              Cadastrar
            </Button>
          </div>
        </Card>
      ) : null}

      <Card title="Lista de lojas">
        <div className="mb-3 max-w-md">
          <Input placeholder="Buscar loja..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="space-y-2">
          {filtered.map((l) => (
            <div
              key={l.id}
              className="flex flex-col gap-2 rounded-md border bg-white px-3 py-2 md:flex-row md:items-center md:justify-between dark:bg-slate-900"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{l.nome}</div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {l.cidade} - {l.estado}
                </div>
                {l.login_email ? (
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">Login: {l.login_email}</div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Link
                  className="inline-flex items-center justify-center rounded-md border bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  to={`/dashboard?loja_id=${l.id}`}
                >
                  Dashboard
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  to={`/lojas/${l.id}`}
                >
                  Entrar
                </Link>
                <Button
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                  onClick={() => {
                    setEditingId((curr) => (curr === l.id ? null : l.id));
                    setEditEmail(l.login_email ?? "");
                    setEditPassword("");
                  }}
                >
                  Credenciais
                </Button>
              </div>

              {editingId === l.id ? (
                <div className="w-full border-t pt-2 md:col-span-2 md:border-t-0 md:pt-0">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <Input placeholder="Novo e-mail" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    <Input
                      placeholder="Nova senha (mín. 6)"
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                    />
                    <Button
                      className="bg-ok-600 hover:bg-ok-500"
                      disabled={resetM.isPending || (!editEmail && editPassword.length < 6)}
                      onClick={() => resetM.mutate()}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}

          {filtered.length === 0 ? (
            <div className="text-sm text-slate-500">Nenhuma loja encontrada.</div>
          ) : null}
        </div>
      </Card>
    </Page>
  );
}
