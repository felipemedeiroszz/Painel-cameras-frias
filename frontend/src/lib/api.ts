import { fetchJson } from "./http";
import type { DashboardCards, DeviceConfig, Dispositivo, Evento, Leitura, Loja, ResumoDiario, Setor, TipoCamera } from "./types";

export function apiLogin(email: string, password: string) {
  return fetchJson<{ token: string; user: { id: number; email: string } }>("/api/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

export function apiGetLojas(token: string) {
  return fetchJson<Loja[]>("/api/lojas", { token });
}

export function apiCreateLoja(
  token: string,
  input: { nome: string; cidade: string; estado: string; email: string; password: string }
) {
  return fetchJson<{ id: number }>("/api/lojas", { token, method: "POST", body: input });
}

export function apiUpdateLojaCredentials(
  token: string,
  lojaId: number,
  input: { email?: string; password?: string }
) {
  return fetchJson<{ ok: true }>(`/api/lojas/${lojaId}/credentials`, { token, method: "PUT", body: input });
}

export function apiGetSetores(token: string) {
  return fetchJson<Setor[]>("/api/setores", { token });
}

export function apiGetTiposCamera(token: string) {
  return fetchJson<TipoCamera[]>("/api/tipos-camera", { token });
}

export function apiGetDispositivos(
  token: string,
  filters: { loja_id?: number; setor_id?: number; tipo_camera_id?: number; id?: number; status?: "online" | "offline" }
) {
  const params = new URLSearchParams();
  if (filters.id) params.set("id", String(filters.id));
  if (filters.loja_id) params.set("loja_id", String(filters.loja_id));
  if (filters.setor_id) params.set("setor_id", String(filters.setor_id));
  if (filters.tipo_camera_id) params.set("tipo_camera_id", String(filters.tipo_camera_id));
  if (filters.status) params.set("status", filters.status);
  return fetchJson<Dispositivo[]>(`/api/dispositivos?${params.toString()}`, { token });
}

export function apiCreateDispositivo(
  token: string,
  input: {
    nome: string;
    loja_id: number;
    setor_id: number;
    tipo_camera_id: number;
    ip_camera?: string;
    temperatura_min?: number;
    temperatura_max?: number;
    horarios?: string[];
  }
) {
  return fetchJson<{ id: number }>("/api/dispositivos", { token, method: "POST", body: input });
}

export function apiGetDeviceConfig(token: string, deviceId: number) {
  return fetchJson<DeviceConfig>(`/api/dispositivos/${deviceId}/config`, { token });
}

export function apiUpdateDeviceConfig(
  token: string,
  deviceId: number,
  input: { temperatura_min: number; temperatura_max: number; horarios: string[] }
) {
  return fetchJson<{ ok: true }>(`/api/dispositivos/${deviceId}/config`, { token, method: "PUT", body: input });
}

export function apiGetLeituras(
  token: string,
  filters: {
    dispositivo_id?: number;
    loja_id?: number;
    setor_id?: number;
    tipo_camera_id?: number;
    from?: string;
    to?: string;
    tipo_registro?: "automatico" | "tempo_real";
    limit?: number;
  }
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined) return;
    params.set(k, String(v));
  });
  return fetchJson<Leitura[]>(`/api/leituras?${params.toString()}`, { token });
}

export function apiGetEventos(
  token: string,
  filters: {
    dispositivo_id?: number;
    loja_id?: number;
    setor_id?: number;
    tipo_camera_id?: number;
    from?: string;
    to?: string;
    tipo_evento?: Evento["tipo_evento"];
    limit?: number;
  }
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined) return;
    params.set(k, String(v));
  });
  return fetchJson<Evento[]>(`/api/eventos?${params.toString()}`, { token });
}

export function apiGetResumo(
  token: string,
  filters: { data: string; dispositivo_id?: number; loja_id?: number; setor_id?: number; tipo_camera_id?: number }
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined) return;
    params.set(k, String(v));
  });
  return fetchJson<ResumoDiario[]>(`/api/resumo?${params.toString()}`, { token });
}

export function apiGetDashboardCards(token: string, dispositivo_id: number, data: string) {
  const params = new URLSearchParams({ dispositivo_id: String(dispositivo_id), data });
  return fetchJson<DashboardCards>(`/api/dashboard/cards?${params.toString()}`, { token });
}
