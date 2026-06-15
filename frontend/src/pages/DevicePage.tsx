import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { useAuth } from "../auth/AuthContext";
import { API_URL } from "../lib/config";
import {
  apiGetDashboardCards,
  apiGetDeviceConfig,
  apiGetDispositivos,
  apiGetEventos,
  apiGetLeituras
} from "../lib/api";
import { generateEsp32CamSnapshotSketch } from "../lib/esp32Sketch";
import { Card } from "../ui/Card";
import { formatSeconds, formatTemp } from "../lib/format";
import { TemperatureChart } from "../components/TemperatureChart";
import { EventsTable } from "../components/EventsTable";
import { Button } from "../ui/Button";
import { Page } from "../ui/Page";

export function DevicePage() {
  const { id } = useParams();
  const deviceId = Number(id);
  const { token } = useAuth();

  const today = format(new Date(), "yyyy-MM-dd");
  const from = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const to = useMemo(() => new Date().toISOString(), []);

  const deviceQ = useQuery({
    queryKey: ["dispositivos", { id: deviceId }],
    queryFn: async () => {
      const list = await apiGetDispositivos(token!, { id: deviceId });
      return list[0] ?? null;
    },
    enabled: Boolean(token && Number.isFinite(deviceId))
  });

  const cfgQ = useQuery({
    queryKey: ["config", { deviceId }],
    queryFn: () => apiGetDeviceConfig(token!, deviceId),
    enabled: Boolean(token && Number.isFinite(deviceId))
  });

  const cardsQ = useQuery({
    queryKey: ["cards", { deviceId, today }],
    queryFn: () => apiGetDashboardCards(token!, deviceId, today),
    enabled: Boolean(token && Number.isFinite(deviceId))
  });

  const leiturasQ = useQuery({
    queryKey: ["leituras", { deviceId, from, to }],
    queryFn: () => apiGetLeituras(token!, { dispositivo_id: deviceId, from, to, limit: 2000 }),
    enabled: Boolean(token && Number.isFinite(deviceId))
  });

  const eventosQ = useQuery({
    queryKey: ["eventos", { deviceId, from, to }],
    queryFn: () => apiGetEventos(token!, { dispositivo_id: deviceId, from, to, limit: 500 }),
    enabled: Boolean(token && Number.isFinite(deviceId))
  });

  const [showSketch, setShowSketch] = useState(false);
  const [copied, setCopied] = useState(false);
  const sketch = generateEsp32CamSnapshotSketch({ apiBaseUrl: API_URL, dispositivoId: deviceId });

  async function copySketch() {
    try {
      await navigator.clipboard.writeText(sketch);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = sketch;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (!Number.isFinite(deviceId)) {
    return <div className="text-slate-300">ID inválido.</div>;
  }

  return (
    <Page
      title={deviceQ.data?.nome ?? `Dispositivo #${deviceId}`}
      subtitle={`${deviceQ.data?.loja_nome ?? ""}${deviceQ.data?.setor_nome ? ` · ${deviceQ.data.setor_nome}` : ""}`}
      actions={
        <>
          <Link
            to="/dispositivos"
            className="inline-flex items-center justify-center rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            Dispositivos
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Dashboard
          </Link>
        </>
      }
    >

      <Card title="Cards principais">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Temperatura atual</div>
            <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatTemp(cardsQ.data?.temperatura_atual ?? null)}
            </div>
          </div>
          <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Porta</div>
            <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{cardsQ.data?.porta_status ?? "--"}</div>
          </div>
          <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tempo aberto hoje</div>
            <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatSeconds(cardsQ.data?.tempo_aberto_hoje_segundos ?? 0)}
            </div>
          </div>
          <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de aberturas</div>
            <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{cardsQ.data?.total_aberturas_hoje ?? 0}</div>
          </div>
          <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de alarmes</div>
            <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{cardsQ.data?.total_alarmes_hoje ?? 0}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Dados em tempo real (hoje)">
            <TemperatureChart leituras={leiturasQ.data ?? []} horarios={cfgQ.data?.horarios ?? []} />
          </Card>
          <Card title="Eventos (hoje)">
            <EventsTable eventos={eventosQ.data ?? []} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Alertas inteligentes">
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div>Temperatura &lt; mínima → evento temperatura_fora_padrao</div>
              <div>Temperatura &gt; máxima → evento temperatura_fora_padrao</div>
              <div>Porta aberta &gt; 60s → evento alarme_disparado</div>
              <div>Botão de pânico → evento botao_panico_ativado / botao_panico_desativado</div>
            </div>
          </Card>

          <Card title="Sketch do ESP32 (copiar e colar)">
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                onClick={() => setShowSketch((v) => !v)}
              >
                {showSketch ? "Ocultar" : "Ver"}
              </Button>
              <Button className="bg-ok-600 hover:bg-ok-500" onClick={copySketch}>
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            {showSketch ? (
              <textarea
                readOnly
                value={sketch}
                className="mt-3 h-72 w-full rounded-lg border bg-white p-2 font-mono text-[11px] text-slate-900 dark:bg-slate-950 dark:text-slate-100"
              />
            ) : null}
          </Card>
        </div>
      </div>
    </Page>
  );
}
