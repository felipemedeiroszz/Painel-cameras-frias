import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { apiGetDispositivos } from "../lib/api";
import { Badge } from "../ui/Badge";

function isPanicActivatedAlert(v: unknown): v is { dispositivo_id: number; tipo: "botao_panico_ativado"; data_hora?: string } {
  if (!v || typeof v !== "object") return false;
  if (!("tipo" in v) || !("dispositivo_id" in v)) return false;
  const tipo = (v as { tipo?: unknown }).tipo;
  const id = (v as { dispositivo_id?: unknown }).dispositivo_id;
  if (tipo !== "botao_panico_ativado") return false;
  return typeof id === "number";
}

export function GlobalAlert() {
  const { token } = useAuth();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [when, setWhen] = useState<string | null>(null);

  useEffect(() => {
    const onAlert = (e: Event) => {
      const detail = (e as CustomEvent).detail as unknown;
      if (!isPanicActivatedAlert(detail)) return;
      setActiveId(detail.dispositivo_id);
      setWhen(typeof detail.data_hora === "string" ? detail.data_hora : null);
    };
    const onEvento = (e: Event) => {
      const detail = (e as CustomEvent).detail as { dispositivo_id: number; tipo_evento: string };
      if (detail?.tipo_evento === "botao_panico_desativado") {
        setActiveId((id) => (id === detail.dispositivo_id ? null : id));
        setWhen(null);
      }
    };
    window.addEventListener("rt:alert", onAlert);
    window.addEventListener("rt:evento", onEvento);
    return () => {
      window.removeEventListener("rt:alert", onAlert);
      window.removeEventListener("rt:evento", onEvento);
    };
  }, []);

  const deviceQ = useQuery({
    queryKey: ["dispositivos", { id: activeId }],
    queryFn: async () => {
      if (!activeId) return null;
      const list = await apiGetDispositivos(token!, { id: activeId });
      return list[0] ?? null;
    },
    enabled: Boolean(token && activeId)
  });

  if (!activeId) return null;
  const d = deviceQ.data;

  return (
    <div className="sticky top-0 z-50 mb-4">
      <div className="rounded-2xl border border-rose-300/60 bg-rose-50/80 p-4 text-rose-900 shadow ring-1 ring-rose-200/60 backdrop-blur dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 dark:ring-rose-500/20">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight">🚨 BOTÃO DE PÂNICO ATIVADO</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              {d ? (
                <>
                  <Badge tone="neutral">{d.loja_nome}</Badge>
                  <Badge tone="neutral">{d.setor_nome}</Badge>
                  <Badge tone="neutral">{d.nome}</Badge>
                </>
              ) : null}
              {when ? <span className="text-rose-800/80 dark:text-rose-200/80">· {new Date(when).toLocaleString()}</span> : null}
            </div>
          </div>
          <div className="mt-2 text-xs text-rose-800/80 dark:text-rose-200/80">
            Para desligar: pressione novamente o botão físico na loja.
          </div>
        </div>
      </div>
    </div>
  );
}
