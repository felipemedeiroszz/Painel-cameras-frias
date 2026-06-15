import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthContext";
import { apiGetDispositivos, apiGetLojas, apiGetSetores, apiGetTiposCamera } from "../lib/api";
import { API_URL } from "../lib/config";
import { generateEsp32CamSnapshotSketch } from "../lib/esp32Sketch";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Page } from "../ui/Page";
import { Select } from "../ui/Select";
import { Toolbar } from "../ui/Toolbar";

export function DevicesPage() {
  const { token } = useAuth();

  const [lojaId, setLojaId] = useState<number | null>(null);
  const [setorId, setSetorId] = useState<number | null>(null);
  const [tipoCameraId, setTipoCameraId] = useState<number | null>(null);
  const [status, setStatus] = useState<"" | "online" | "offline">("");
  const [search, setSearch] = useState("");

  const [openSketchId, setOpenSketchId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const lojasQ = useQuery({ queryKey: ["lojas"], queryFn: () => apiGetLojas(token!), enabled: Boolean(token) });
  const setoresQ = useQuery({ queryKey: ["setores"], queryFn: () => apiGetSetores(token!), enabled: Boolean(token) });
  const tiposQ = useQuery({ queryKey: ["tipos-camera"], queryFn: () => apiGetTiposCamera(token!), enabled: Boolean(token) });

  const dispositivosQ = useQuery({
    queryKey: ["dispositivos", { lojaId, setorId, tipoCameraId, status }],
    queryFn: () =>
      apiGetDispositivos(token!, {
        loja_id: lojaId ?? undefined,
        setor_id: setorId ?? undefined,
        tipo_camera_id: tipoCameraId ?? undefined,
        status: status ? status : undefined
      }),
    enabled: Boolean(token)
  });

  const filtered = useMemo(() => {
    const list = dispositivosQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => `${d.nome} ${d.loja_nome} ${d.setor_nome} ${d.tipo_camera_nome}`.toLowerCase().includes(q));
  }, [dispositivosQ.data, search]);

  async function copyText(text: string, deviceId: number) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedId(deviceId);
    window.setTimeout(() => setCopiedId((v) => (v === deviceId ? null : v)), 1500);
  }

  return (
    <Page
      title="Dispositivos"
      subtitle="Visualize o status e copie o sketch pronto por dispositivo."
      actions={
        <Link
          to="/dispositivos/novo"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          Novo dispositivo
        </Link>
      }
    >
      <Toolbar>
        <div className="min-w-[220px] flex-1">
          <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Buscar</div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, loja, setor..." />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Loja</div>
          <Select value={lojaId ?? ""} onChange={(e) => setLojaId(e.target.value ? Number(e.target.value) : null)}>
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
          <Select value={setorId ?? ""} onChange={(e) => setSetorId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Todos</option>
            {(setoresQ.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Tipo</div>
          <Select
            value={tipoCameraId ?? ""}
            onChange={(e) => setTipoCameraId(e.target.value ? Number(e.target.value) : null)}
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
          <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Status</div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as "" | "online" | "offline")}>
            <option value="">Todos</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </Select>
        </div>
      </Toolbar>

      <Card title={`Lista (${filtered.length})`}>
        <div className="space-y-2">
          {filtered.map((d) => {
            const sketch = generateEsp32CamSnapshotSketch({ apiBaseUrl: API_URL, dispositivoId: d.id });
            return (
              <div key={d.id} className="rounded-xl border bg-white/70 p-3 dark:bg-slate-950/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{d.nome}</div>
                      <Badge tone={d.status === "online" ? "ok" : "neutral"}>{d.status}</Badge>
                      {d.porta_status ? <Badge tone={d.porta_status === "aberta" ? "warn" : "neutral"}>{d.porta_status}</Badge> : null}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">
                      {d.loja_nome} · {d.setor_nome} · {d.tipo_camera_nome}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/dispositivos/${d.id}`}
                      className="inline-flex items-center justify-center rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                    >
                      Abrir
                    </Link>
                    <Button
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                      onClick={() => setOpenSketchId((v) => (v === d.id ? null : d.id))}
                    >
                      {openSketchId === d.id ? "Fechar sketch" : "Ver sketch"}
                    </Button>
                    <Button
                      className="bg-ok-600 hover:bg-ok-500"
                      onClick={() => copyText(sketch, d.id)}
                    >
                      {copiedId === d.id ? "Copiado" : "Copiar sketch"}
                    </Button>
                  </div>
                </div>

                {openSketchId === d.id ? (
                  <div className="mt-3">
                    <textarea
                      readOnly
                      value={sketch}
                      className="h-72 w-full rounded-lg border bg-white p-2 font-mono text-[11px] text-slate-900 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}

          {filtered.length === 0 ? <div className="text-sm text-slate-600 dark:text-slate-400">Nenhum dispositivo.</div> : null}
        </div>
      </Card>
    </Page>
  );
}

