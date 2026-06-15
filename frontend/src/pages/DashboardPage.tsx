import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { useAuth } from "../auth/AuthContext";
import {
  apiCreateDispositivo,
  apiCreateLoja,
  apiGetDashboardCards,
  apiGetDeviceConfig,
  apiGetDispositivos,
  apiGetEventos,
  apiGetLeituras,
  apiGetLojas,
  apiGetSetores,
  apiGetTiposCamera
} from "../lib/api";
import type { Dispositivo } from "../lib/types";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { TemperatureChart } from "../components/TemperatureChart";
import { EventsTable } from "../components/EventsTable";
import { formatSeconds, formatTemp } from "../lib/format";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Page } from "../ui/Page";
import { StatCard } from "../ui/StatCard";

function getParamNumber(params: URLSearchParams, key: string): number | undefined {
  const v = params.get(key);
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function statusColor(status: Dispositivo["status"]): string {
  if (status === "online") return "bg-ok-500";
  return "bg-slate-500";
}

export function DashboardPage() {
  const { token, lojaId: authLojaId } = useAuth();
  const qc = useQueryClient();
  const isAdmin = authLojaId === null;
  const [params, setParams] = useSearchParams();
  const lojaId = getParamNumber(params, "loja_id");
  const setorId = getParamNumber(params, "setor_id");
  const tipoCameraId = getParamNumber(params, "tipo_camera_id");
  const deviceId = getParamNumber(params, "dispositivo_id");

  const today = format(new Date(), "yyyy-MM-dd");
  const from = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const to = useMemo(() => new Date().toISOString(), []);

  const lojasQ = useQuery({
    queryKey: ["lojas"],
    queryFn: () => apiGetLojas(token!),
    enabled: Boolean(token)
  });

  const setoresQ = useQuery({
    queryKey: ["setores"],
    queryFn: () => apiGetSetores(token!),
    enabled: Boolean(token)
  });

  const tiposQ = useQuery({
    queryKey: ["tipos-camera"],
    queryFn: () => apiGetTiposCamera(token!),
    enabled: Boolean(token)
  });

  const dispositivosQ = useQuery({
    queryKey: ["dispositivos", { lojaId, setorId, tipoCameraId }],
    queryFn: () =>
      apiGetDispositivos(token!, {
        loja_id: lojaId,
        setor_id: setorId,
        tipo_camera_id: tipoCameraId
      }),
    enabled: Boolean(token)
  });

  const selectedDevice = useMemo(() => {
    const list = dispositivosQ.data ?? [];
    if (!list.length) return null;
    if (deviceId) return list.find((d) => d.id === deviceId) ?? list[0];
    return list[0];
  }, [dispositivosQ.data, deviceId]);

  const cardsQ = useQuery({
    queryKey: ["cards", { deviceId: selectedDevice?.id, today }],
    queryFn: () => apiGetDashboardCards(token!, selectedDevice!.id, today),
    enabled: Boolean(token && selectedDevice)
  });

  const cfgQ = useQuery({
    queryKey: ["config", { deviceId: selectedDevice?.id }],
    queryFn: () => apiGetDeviceConfig(token!, selectedDevice!.id),
    enabled: Boolean(token && selectedDevice)
  });

  const leiturasQ = useQuery({
    queryKey: ["leituras", { deviceId: selectedDevice?.id, from, to }],
    queryFn: () => apiGetLeituras(token!, { dispositivo_id: selectedDevice!.id, from, to, limit: 2000 }),
    enabled: Boolean(token && selectedDevice)
  });

  const eventosQ = useQuery({
    queryKey: ["eventos", { deviceId: selectedDevice?.id, from, to }],
    queryFn: () => apiGetEventos(token!, { dispositivo_id: selectedDevice!.id, from, to, limit: 200 }),
    enabled: Boolean(token && selectedDevice)
  });

  const [creatingLoja, setCreatingLoja] = useState(false);
  const [lojaNome, setLojaNome] = useState("");
  const [lojaCidade, setLojaCidade] = useState("");
  const [lojaEstado, setLojaEstado] = useState("SP");
  const [lojaEmail, setLojaEmail] = useState("");
  const [lojaSenha, setLojaSenha] = useState("");
  const createLojaM = useMutation({
    mutationFn: () =>
      apiCreateLoja(token!, {
        nome: lojaNome,
        cidade: lojaCidade,
        estado: lojaEstado,
        email: lojaEmail,
        password: lojaSenha
      }),
    onSuccess: async () => {
      setCreatingLoja(false);
      setLojaNome("");
      setLojaCidade("");
      setLojaEmail("");
      setLojaSenha("");
      await qc.invalidateQueries({ queryKey: ["lojas"] });
    }
  });

  const [creatingDevice, setCreatingDevice] = useState(false);
  const [deviceNome, setDeviceNome] = useState("");
  const [deviceIp, setDeviceIp] = useState("");
  const createDeviceM = useMutation({
    mutationFn: () =>
      apiCreateDispositivo(token!, {
        nome: deviceNome,
        loja_id: lojaId ?? (lojasQ.data?.[0]?.id ?? 1),
        setor_id: setorId ?? (setoresQ.data?.[0]?.id ?? 1),
        tipo_camera_id: tipoCameraId ?? (tiposQ.data?.[0]?.id ?? 1),
        ip_camera: deviceIp || undefined
      }),
    onSuccess: async () => {
      setCreatingDevice(false);
      setDeviceNome("");
      setDeviceIp("");
      await qc.invalidateQueries({ queryKey: ["dispositivos"] });
    }
  });

  const filteredDevices = dispositivosQ.data ?? [];
  const onlineCount = filteredDevices.filter((d) => d.status === "online").length;
  const offlineCount = filteredDevices.filter((d) => d.status === "offline").length;
  const camerasCount = filteredDevices.filter((d) => Boolean(d.ip_camera)).length;
  const lojaScopeNome = useMemo(() => {
    if (!lojaId) return "Todas as lojas";
    return (lojasQ.data ?? []).find((l) => l.id === lojaId)?.nome ?? `Loja #${lojaId}`;
  }, [lojaId, lojasQ.data]);

  return (
    <Page
      title="Dashboard"
      subtitle={lojaScopeNome}
      actions={
        <>
          <Link
            to="/configuracao"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Configuração
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dispositivos" value={filteredDevices.length} hint="No filtro atual" />
        <StatCard label="Online" value={onlineCount} tone="ok" hint="Último status recebido" />
        <StatCard label="Offline" value={offlineCount} tone="neutral" hint="Sem sinal recente" />
        <StatCard label="Câmeras" value={camerasCount} hint="Com snapshot" />
      </div>

      <Card title="Filtros globais">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Loja</div>
            <Select
              value={lojaId ?? ""}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                const v = e.target.value;
                if (!v) next.delete("loja_id");
                else next.set("loja_id", v);
                next.delete("dispositivo_id");
                setParams(next, { replace: true });
              }}
            >
              <option value="">Todas</option>
              {(lojasQ.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Setor</div>
            <Select
              value={setorId ?? ""}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                const v = e.target.value;
                if (!v) next.delete("setor_id");
                else next.set("setor_id", v);
                next.delete("dispositivo_id");
                setParams(next, { replace: true });
              }}
            >
              <option value="">Todos</option>
              {(setoresQ.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Tipo de câmara</div>
            <Select
              value={tipoCameraId ?? ""}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                const v = e.target.value;
                if (!v) next.delete("tipo_camera_id");
                else next.set("tipo_camera_id", v);
                next.delete("dispositivo_id");
                setParams(next, { replace: true });
              }}
            >
              <option value="">Todos</option>
              {(tiposQ.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Dispositivo</div>
            <Select
              value={selectedDevice?.id ?? ""}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                const v = e.target.value;
                if (!v) next.delete("dispositivo_id");
                else next.set("dispositivo_id", v);
                setParams(next, { replace: true });
              }}
            >
              {(dispositivosQ.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {isAdmin ? (
            <Button onClick={() => setCreatingLoja((v) => !v)} className="bg-slate-900 hover:bg-slate-800">
              Nova loja
            </Button>
          ) : null}
          <Button onClick={() => setCreatingDevice((v) => !v)} className="bg-slate-900 hover:bg-slate-800">
            Novo dispositivo
          </Button>
        </div>

        {isAdmin && creatingLoja ? (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-6">
            <Input placeholder="Nome" value={lojaNome} onChange={(e) => setLojaNome(e.target.value)} />
            <Input placeholder="Cidade" value={lojaCidade} onChange={(e) => setLojaCidade(e.target.value)} />
            <Input placeholder="UF" value={lojaEstado} onChange={(e) => setLojaEstado(e.target.value)} />
            <Input placeholder="E-mail da loja" value={lojaEmail} onChange={(e) => setLojaEmail(e.target.value)} />
            <Input placeholder="Senha (mín. 6)" type="password" value={lojaSenha} onChange={(e) => setLojaSenha(e.target.value)} />
            <Button
              disabled={!lojaNome || !lojaCidade || !lojaEstado || !lojaEmail || lojaSenha.length < 6 || createLojaM.isPending}
              onClick={() => createLojaM.mutate()}
              className="bg-ok-600 hover:bg-ok-500"
            >
              Cadastrar
            </Button>
          </div>
        ) : null}

        {creatingDevice ? (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input placeholder="Nome" value={deviceNome} onChange={(e) => setDeviceNome(e.target.value)} />
            <Input placeholder="IP da câmera (opcional)" value={deviceIp} onChange={(e) => setDeviceIp(e.target.value)} />
            <div className="hidden md:block" />
            <Button
              disabled={!deviceNome || createDeviceM.isPending}
              onClick={() => createDeviceM.mutate()}
              className="bg-ok-600 hover:bg-ok-500"
            >
              Cadastrar
            </Button>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Dispositivos">
          <div className="space-y-2">
            {(dispositivosQ.data ?? []).map((d) => (
              <Link
                key={d.id}
                to={`/dispositivos/${d.id}`}
                className="flex items-center justify-between rounded-md border bg-white px-3 py-2 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusColor(d.status)}`} />
                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{d.nome}</div>
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {d.loja_nome} · {d.setor_nome} · {d.tipo_camera_nome}
                  </div>
                </div>
                <div className="text-right text-sm text-slate-700 dark:text-slate-200">{formatTemp(d.temperatura_atual)}</div>
              </Link>
            ))}
            {(dispositivosQ.data ?? []).length === 0 ? (
              <div className="text-sm text-slate-500">Nenhum dispositivo no filtro atual.</div>
            ) : null}
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card title={`Cards principais ${selectedDevice ? `· ${selectedDevice.nome}` : ""}`}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Temperatura atual</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatTemp(cardsQ.data?.temperatura_atual ?? null)}
                </div>
              </div>
              <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Porta</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {cardsQ.data?.porta_status ?? "--"}
                </div>
              </div>
              <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tempo aberto hoje</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatSeconds(cardsQ.data?.tempo_aberto_hoje_segundos ?? 0)}
                </div>
              </div>
              <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de aberturas</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {cardsQ.data?.total_aberturas_hoje ?? 0}
                </div>
              </div>
              <div className="rounded-md border bg-white p-3 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de alarmes</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {cardsQ.data?.total_alarmes_hoje ?? 0}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Gráfico de temperatura (hoje)">
            <TemperatureChart leituras={leiturasQ.data ?? []} horarios={cfgQ.data?.horarios ?? []} />
          </Card>

          <Card title="Lista de eventos (hoje)">
            <EventsTable eventos={eventosQ.data ?? []} />
          </Card>

          {selectedDevice?.ip_camera ? (
            <Card title="Câmera ao vivo">
              <div className="overflow-hidden rounded-md border bg-black">
                <img
                  src={`http://${selectedDevice.ip_camera}:81/stream`}
                  className="h-80 w-full object-contain"
                  alt="Stream"
                />
              </div>
              <div className="mt-2 text-xs text-slate-400">
                URL: http://{selectedDevice.ip_camera}:81/stream
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </Page>
  );
}
