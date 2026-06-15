import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { apiCreateDispositivo, apiGetLojas, apiGetSetores, apiGetTiposCamera } from "../lib/api";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { API_URL } from "../lib/config";
import { generateEsp32CamSnapshotSketch } from "../lib/esp32Sketch";
import { Page } from "../ui/Page";

export function DeviceCreatePage() {
  const { token, lojaId } = useAuth();
  const qc = useQueryClient();

  const lojasQ = useQuery({ queryKey: ["lojas"], queryFn: () => apiGetLojas(token!), enabled: Boolean(token) });
  const setoresQ = useQuery({ queryKey: ["setores"], queryFn: () => apiGetSetores(token!), enabled: Boolean(token) });
  const tiposQ = useQuery({ queryKey: ["tipos-camera"], queryFn: () => apiGetTiposCamera(token!), enabled: Boolean(token) });

  const [nome, setNome] = useState("");
  const [ip, setIp] = useState("");
  const [pickedLoja, setPickedLoja] = useState<number | null>(null);
  const [pickedSetor, setPickedSetor] = useState<number | null>(null);
  const [pickedTipo, setPickedTipo] = useState<number | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const loja = lojaId ?? pickedLoja ?? lojasQ.data?.[0]?.id ?? null;
  const setor = pickedSetor ?? setoresQ.data?.[0]?.id ?? null;
  const tipo = pickedTipo ?? tiposQ.data?.[0]?.id ?? null;

  const createM = useMutation({
    mutationFn: async () =>
      apiCreateDispositivo(token!, {
        nome,
        loja_id: loja!,
        setor_id: setor!,
        tipo_camera_id: tipo!,
        ip_camera: ip || undefined
      }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["dispositivos"] });
      setCreatedId(data.id);
    }
  });

  const canSubmit = nome && loja && setor && tipo;
  const canSelectLoja = !lojaId;
  const sketch = createdId ? generateEsp32CamSnapshotSketch({ apiBaseUrl: API_URL, dispositivoId: createdId }) : "";

  async function copySketch() {
    if (!sketch) return;
    try {
      await navigator.clipboard.writeText(sketch);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = sketch;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <Page title="Novo dispositivo" subtitle="Cadastre a câmara e copie o sketch pronto com o ID correto.">
      <Card title="Dados do dispositivo">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Nome</div>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Câmara 01" />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">IP da câmera (opcional)</div>
            <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="ex: 192.168.0.50" />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Loja</div>
            <Select value={loja ?? ""} onChange={(e) => setPickedLoja(Number(e.target.value))} disabled={!canSelectLoja}>
              {(lojasQ.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Setor</div>
            <Select value={setor ?? ""} onChange={(e) => setPickedSetor(Number(e.target.value))}>
              {(setoresQ.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Tipo de câmara</div>
            <Select value={tipo ?? ""} onChange={(e) => setPickedTipo(Number(e.target.value))}>
              {(tiposQ.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Button className="bg-ok-600 hover:bg-ok-500" onClick={() => createM.mutate()} disabled={!canSubmit || createM.isPending}>
            Cadastrar dispositivo
          </Button>
          {createM.isError ? <div className="mt-2 text-sm text-bad-500">Falha ao cadastrar.</div> : null}
        </div>
      </Card>

      {createdId ? (
        <Card title="Sketch pronto">
          <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">
            DISPOSITIVO_ID = {createdId}. Cole no Arduino IDE e ajuste Wi‑Fi e senha.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={copySketch}
            >
              {copied ? "Copiado" : "Copiar sketch"}
            </button>
            <Link
              to="/dispositivos"
              className="rounded-md border bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Ir para Dispositivos
            </Link>
            <Link
              to={`/dispositivos/${createdId}`}
              className="rounded-md border bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Abrir dispositivo
            </Link>
          </div>
          <textarea
            readOnly
            value={sketch}
            className="mt-3 h-72 w-full rounded-md border bg-white p-2 font-mono text-[11px] text-slate-900 dark:bg-slate-950 dark:text-slate-100"
          />
        </Card>
      ) : null}
    </Page>
  );
}
