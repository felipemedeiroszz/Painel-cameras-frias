import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { apiGetLojas } from "../lib/api";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { fetchJson } from "../lib/http";
import { Page } from "../ui/Page";

export function ConfigPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const lojasQ = useQuery({
    queryKey: ["lojas"],
    queryFn: () => apiGetLojas(token!),
    enabled: Boolean(token)
  });

  const [tempMin, setTempMin] = useState<number>(-20);
  const [tempMax, setTempMax] = useState<number>(-15);
  const [h1, setH1] = useState("07:00");
  const [h2, setH2] = useState("15:00");
  const [h3, setH3] = useState("22:00");

  const lojasLabel = useMemo(() => {
    const count = lojasQ.data?.length ?? 0;
    if (count === 0) return "Todas as lojas";
    if (count === 1) return `Loja: ${lojasQ.data?.[0]?.nome ?? ""}`;
    return `Todas as lojas (${count})`;
  }, [lojasQ.data]);

  const applyM = useMutation({
    mutationFn: async () => {
      return fetchJson<{ ok: true }>(`/api/config/apply`, {
        token: token!,
        method: "PUT",
        body: { temperatura_min: tempMin, temperatura_max: tempMax, horarios: [h1, h2, h3] }
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries();
    }
  });

  return (
    <Page
      title="Configuração"
      subtitle="Defina horários e temperaturas padrão para todos os dispositivos de todas as lojas no seu escopo."
    >

      <Card title="Parâmetros">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Escopo</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{lojasLabel}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Temperatura mínima</div>
            <Input type="number" value={tempMin} onChange={(e) => setTempMin(Number(e.target.value))} />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Temperatura máxima</div>
            <Input type="number" value={tempMax} onChange={(e) => setTempMax(Number(e.target.value))} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Horário 1</div>
            <Input type="time" value={h1} onChange={(e) => setH1(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Horário 2</div>
            <Input type="time" value={h2} onChange={(e) => setH2(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Horário 3</div>
            <Input type="time" value={h3} onChange={(e) => setH3(e.target.value)} />
          </div>
        </div>

        <div className="mt-4">
          <Button
            className="bg-ok-600 hover:bg-ok-500"
            disabled={applyM.isPending}
            onClick={() => applyM.mutate()}
          >
            Aplicar configuração
          </Button>
        </div>
        {applyM.isError ? <div className="mt-2 text-sm text-bad-500">Falha ao aplicar configuração.</div> : null}
        {applyM.isSuccess ? <div className="mt-2 text-sm text-ok-500">Configuração aplicada.</div> : null}
      </Card>
    </Page>
  );
}
