import { Link, useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthContext";
import { apiGetDispositivos, apiGetLojas } from "../lib/api";
import { Card } from "../ui/Card";
import { formatTemp } from "../lib/format";

export function StorePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const lojaId = Number(id);

  const lojasQ = useQuery({
    queryKey: ["lojas"],
    queryFn: () => apiGetLojas(token!),
    enabled: Boolean(token)
  });

  const loja = useMemo(() => (lojasQ.data ?? []).find((l) => l.id === lojaId) ?? null, [lojasQ.data, lojaId]);

  const dispositivosQ = useQuery({
    queryKey: ["dispositivos", { lojaId }],
    queryFn: () => apiGetDispositivos(token!, { loja_id: lojaId }),
    enabled: Boolean(token && Number.isFinite(lojaId))
  });

  if (!Number.isFinite(lojaId)) {
    return <div className="text-slate-300">Loja inválida.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold text-slate-100">{loja?.nome ?? `Loja #${lojaId}`}</div>
          <div className="text-sm text-slate-400">
            {loja ? `${loja.cidade} - ${loja.estado}` : "Carregando..."}
          </div>
        </div>
        <div className="flex gap-2">
          <ButtonLink to="/lojas">Voltar</ButtonLink>
          <button
            className="inline-flex items-center justify-center rounded-md bg-ok-600 px-3 py-2 text-sm font-medium text-white hover:bg-ok-500"
            onClick={() => navigate(`/dashboard?loja_id=${lojaId}`)}
          >
            Entrar no dashboard
          </button>
        </div>
      </div>

      <Card title="Dispositivos desta loja">
        <div className="space-y-2">
          {(dispositivosQ.data ?? []).map((d) => (
            <Link
              key={d.id}
              to={`/dispositivos/${d.id}`}
              className="flex items-center justify-between rounded-md border bg-white px-3 py-2 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${d.status === "online" ? "bg-ok-500" : "bg-slate-500"}`} />
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{d.nome}</div>
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {d.setor_nome} · {d.tipo_camera_nome}
                </div>
              </div>
              <div className="text-right text-sm text-slate-700 dark:text-slate-200">{formatTemp(d.temperatura_atual)}</div>
            </Link>
          ))}

          {(dispositivosQ.data ?? []).length === 0 ? (
            <div className="text-sm text-slate-500">Nenhum dispositivo cadastrado nesta loja.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function ButtonLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center rounded-md border bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
    >
      {children}
    </Link>
  );
}
