import { Router } from "express";
import { z } from "zod";
import { emitRealtimeEvent } from "../web/socket";
import { signUserToken } from "../auth/jwt";
import { requireAuth } from "../web/middleware/requireAuth";

type Loja = { id: number; nome: string; cidade: string; estado: string };
type Setor = { id: number; nome: string };
type TipoCamera = { id: number; nome: string };
type DeviceStatus = "online" | "offline";
type PortaStatus = "aberta" | "fechada" | null;
type TipoRegistro = "automatico" | "tempo_real";
type TipoEvento =
  | "porta_aberta"
  | "porta_fechada"
  | "alarme_disparado"
  | "temperatura_fora_padrao"
  | "botao_panico_ativado"
  | "botao_panico_desativado";

type Dispositivo = {
  id: number;
  nome: string;
  loja_id: number;
  setor_id: number;
  tipo_camera_id: number;
  ip_camera: string | null;
  status: DeviceStatus;
  temperatura_min: number | null;
  temperatura_max: number | null;
  horario_1: string | null;
  horario_2: string | null;
  horario_3: string | null;
  temperatura_atual: number | null;
  ultima_leitura_at: string | null;
  porta_status: PortaStatus;
  porta_aberta_em: string | null;
  last_seen: string | null;
};

type Leitura = {
  id: number;
  dispositivo_id: number;
  temperatura: number;
  data_hora: string;
  tipo_registro: TipoRegistro;
};

type Evento = {
  id: number;
  dispositivo_id: number;
  tipo_evento: TipoEvento;
  data_hora: string;
  duracao_segundos: number | null;
};

type Resumo = {
  id: number;
  dispositivo_id: number;
  data: string;
  total_aberturas: number;
  tempo_total_aberto: number;
  total_alarmes: number;
};

function utcDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureResumo(resumos: Resumo[], dispositivoId: number, date: string): Resumo {
  const existing = resumos.find((r) => r.dispositivo_id === dispositivoId && r.data === date);
  if (existing) return existing;
  const next: Resumo = {
    id: resumos.length ? Math.max(...resumos.map((r) => r.id)) + 1 : 1,
    dispositivo_id: dispositivoId,
    data: date,
    total_aberturas: 0,
    tempo_total_aberto: 0,
    total_alarmes: 0
  };
  resumos.push(next);
  return next;
}

function touchOnline(d: Dispositivo): void {
  d.status = "online";
  d.last_seen = nowIso();
}

export function createMockApiRouter(): Router {
  const router = Router();

  const users: Array<{
    id: number;
    email: string;
    password: string;
    loja_id: number | null;
    is_admin: boolean;
  }> = [
    { id: 1, email: "admin@sensor.local", password: "admin123", loja_id: null, is_admin: true },
    { id: 2, email: "loja1@sensor.local", password: "admin123", loja_id: 1, is_admin: false },
    { id: 3, email: "loja2@sensor.local", password: "admin123", loja_id: 2, is_admin: false }
  ];

  const lojas: Loja[] = [
    { id: 1, nome: "Loja Centro", cidade: "São Paulo", estado: "SP" },
    { id: 2, nome: "Loja Norte", cidade: "Campinas", estado: "SP" }
  ];
  const setores: Setor[] = [
    { id: 1, nome: "Açougue" },
    { id: 2, nome: "Hortifruti" },
    { id: 3, nome: "Laticínios" }
  ];
  const tipos: TipoCamera[] = [
    { id: 1, nome: "Resfriada" },
    { id: 2, nome: "Congelada" }
  ];
  const dispositivos: Dispositivo[] = [
    {
      id: 1,
      nome: "Câmara 01",
      loja_id: 1,
      setor_id: 1,
      tipo_camera_id: 2,
      ip_camera: "192.168.0.50",
      status: "online",
      temperatura_min: -20,
      temperatura_max: -15,
      horario_1: "07:00",
      horario_2: "15:00",
      horario_3: "22:00",
      temperatura_atual: -18.2,
      ultima_leitura_at: nowIso(),
      porta_status: "fechada",
      porta_aberta_em: null,
      last_seen: nowIso()
    },
    {
      id: 2,
      nome: "Freezer Fundo",
      loja_id: 1,
      setor_id: 3,
      tipo_camera_id: 2,
      ip_camera: null,
      status: "offline",
      temperatura_min: -18,
      temperatura_max: -12,
      horario_1: "07:00",
      horario_2: "15:00",
      horario_3: "22:00",
      temperatura_atual: null,
      ultima_leitura_at: null,
      porta_status: "fechada",
      porta_aberta_em: null,
      last_seen: null
    },
    {
      id: 3,
      nome: "Câmara Resfriada",
      loja_id: 2,
      setor_id: 2,
      tipo_camera_id: 1,
      ip_camera: "192.168.0.51",
      status: "online",
      temperatura_min: 0,
      temperatura_max: 5,
      horario_1: "07:00",
      horario_2: "15:00",
      horario_3: "22:00",
      temperatura_atual: 2.3,
      ultima_leitura_at: nowIso(),
      porta_status: "fechada",
      porta_aberta_em: null,
      last_seen: nowIso()
    }
  ];

  const leituras: Leitura[] = [];
  const eventos: Evento[] = [];
  const resumos: Resumo[] = [];

  const today = utcDateString(new Date());
  for (const d of dispositivos) {
    ensureResumo(resumos, d.id, today);
  }
  let leituraId = 1;
  for (const d of dispositivos) {
    if (d.temperatura_min === null || d.temperatura_max === null) continue;
    const center = (d.temperatura_min + d.temperatura_max) / 2;
    for (let h = 0; h < 24; h += 1) {
      const dt = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), h, 0, 0));
      const temp = Number((center + (Math.random() * 2 - 1)).toFixed(1));
      leituras.push({
        id: leituraId++,
        dispositivo_id: d.id,
        temperatura: temp,
        data_hora: dt.toISOString(),
        tipo_registro: "automatico"
      });
    }
  }

  router.post("/auth/login", async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(1)
      })
      .safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const email = body.data.email.toLowerCase();
    const user = users.find((u) => u.email === email);
    if (!user || user.password !== body.data.password) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }

    const token = signUserToken({
      userId: user.id,
      email: user.email,
      lojaId: user.is_admin ? null : user.loja_id,
      isAdmin: user.is_admin
    });
    res.json({ token, user: { id: user.id, email: user.email } });
  });

  router.get("/dispositivos/:id/config", (req, res) => {
    const id = Number(req.params.id);
    const d = dispositivos.find((x) => x.id === id);
    if (!d) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      temperatura_min: d.temperatura_min,
      temperatura_max: d.temperatura_max,
      horarios: [d.horario_1, d.horario_2, d.horario_3].filter(Boolean).map((h) => (h as string).slice(0, 5))
    });
  });

  router.post("/leituras", (req, res) => {
    const body = z
      .object({
        dispositivo_id: z.number().int().positive(),
        temperatura: z.number(),
        tipo_registro: z.enum(["automatico", "tempo_real"]),
        data_hora: z.string().datetime().optional()
      })
      .safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const d = dispositivos.find((x) => x.id === body.data.dispositivo_id);
    if (!d) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const dt = body.data.data_hora ? new Date(body.data.data_hora) : new Date();
    const leitura: Leitura = {
      id: leituras.length ? Math.max(...leituras.map((l) => l.id)) + 1 : 1,
      dispositivo_id: d.id,
      temperatura: body.data.temperatura,
      data_hora: dt.toISOString(),
      tipo_registro: body.data.tipo_registro
    };
    leituras.push(leitura);

    d.temperatura_atual = body.data.temperatura;
    d.ultima_leitura_at = dt.toISOString();
    touchOnline(d);

    emitRealtimeEvent("leitura:new", { ...leitura, dispositivo_nome: d.nome });
    res.json({ ok: true, leitura });
  });

  router.post("/eventos", (req, res) => {
    const body = z
      .object({
        dispositivo_id: z.number().int().positive(),
        tipo_evento: z.enum(["porta_aberta", "porta_fechada", "alarme_disparado", "temperatura_fora_padrao", "botao_panico_ativado", "botao_panico_desativado"]),
        data_hora: z.string().datetime().optional(),
        duracao_segundos: z.number().int().nonnegative().optional()
      })
      .safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const d = dispositivos.find((x) => x.id === body.data.dispositivo_id);
    if (!d) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const dt = body.data.data_hora ? new Date(body.data.data_hora) : new Date();
    touchOnline(d);

    const ev: Evento = {
      id: eventos.length ? Math.max(...eventos.map((e) => e.id)) + 1 : 1,
      dispositivo_id: d.id,
      tipo_evento: body.data.tipo_evento,
      data_hora: dt.toISOString(),
      duracao_segundos: body.data.duracao_segundos ?? null
    };
    eventos.push(ev);

    const resumo = ensureResumo(resumos, d.id, utcDateString(dt));

    if (body.data.tipo_evento === "porta_aberta") {
      d.porta_status = "aberta";
      d.porta_aberta_em = dt.toISOString();
    }

    if (body.data.tipo_evento === "porta_fechada") {
      d.porta_status = "fechada";
      const start = d.porta_aberta_em ? new Date(d.porta_aberta_em) : null;
      d.porta_aberta_em = null;
      const dur = start ? Math.max(0, Math.floor((dt.getTime() - start.getTime()) / 1000)) : 0;
      resumo.total_aberturas += 1;
      resumo.tempo_total_aberto += dur;
    }

    if (body.data.tipo_evento === "alarme_disparado") {
      resumo.total_alarmes += 1;
    }

    if (body.data.tipo_evento === "temperatura_fora_padrao") {
      resumo.total_alarmes += 1;
      emitRealtimeEvent("alert:new", {
        dispositivo_id: d.id,
        tipo: "temperatura_fora_padrao",
        data_hora: dt.toISOString()
      });
    }

    if (body.data.tipo_evento === "botao_panico_ativado") {
      emitRealtimeEvent("alert:new", {
        dispositivo_id: d.id,
        tipo: "botao_panico_ativado",
        data_hora: dt.toISOString()
      });
    }

    emitRealtimeEvent("evento:new", { ...ev, dispositivo_nome: d.nome });
    res.json({ ok: true });
  });

  router.post("/resumo", (req, res) => {
    const body = z
      .object({
        dispositivo_id: z.number().int().positive(),
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        total_aberturas: z.number().int().nonnegative(),
        tempo_total_aberto: z.number().int().nonnegative(),
        total_alarmes: z.number().int().nonnegative()
      })
      .safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const d = dispositivos.find((x) => x.id === body.data.dispositivo_id);
    if (!d) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    touchOnline(d);

    const r = ensureResumo(resumos, d.id, body.data.data);
    r.total_aberturas = body.data.total_aberturas;
    r.tempo_total_aberto = body.data.tempo_total_aberto;
    r.total_alarmes = body.data.total_alarmes;

    emitRealtimeEvent("resumo:upsert", body.data);
    res.json({ ok: true });
  });

  router.use(requireAuth);

  router.get("/lojas", (req, res) => {
    const lojaId = req.auth?.lojaId ?? null;
    const list = lojas
      .filter((l) => (lojaId ? l.id === lojaId : true))
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome));
    res.json(
      list.map((l) => ({
        ...l,
        login_email: users.find((u) => u.loja_id === l.id && !u.is_admin)?.email ?? null
      }))
    );
  });
  router.get("/setores", (_req, res) => res.json(setores.slice().sort((a, b) => a.nome.localeCompare(b.nome))));
  router.get("/tipos-camera", (_req, res) => res.json(tipos.slice().sort((a, b) => a.nome.localeCompare(b.nome))));

  router.post("/lojas", (req, res) => {
    if (req.auth?.lojaId) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const body = z
      .object({
        nome: z.string().min(1),
        cidade: z.string().min(1),
        estado: z.string().min(2).max(2),
        email: z.string().email(),
        password: z.string().min(6)
      })
      .safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const email = body.data.email.toLowerCase();
    if (users.some((u) => u.email === email)) {
      res.status(409).json({ error: "email_in_use" });
      return;
    }
    const nextId = lojas.length ? Math.max(...lojas.map((l) => l.id)) + 1 : 1;
    lojas.push({ id: nextId, nome: body.data.nome, cidade: body.data.cidade, estado: body.data.estado.toUpperCase() });
    const nextUserId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    users.push({ id: nextUserId, email, password: body.data.password, loja_id: nextId, is_admin: false });
    res.status(201).json({ id: nextId });
  });

  router.put("/lojas/:id/credentials", (req, res) => {
    const lojaId = Number(req.params.id);
    if (!Number.isFinite(lojaId)) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }

    const scope = (req.auth?.lojaId as number | null) ?? null;
    if (scope && scope !== lojaId) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const body = z
      .object({
        email: z.string().email().optional(),
        password: z.string().min(6).optional()
      })
      .refine((v) => Boolean(v.email || v.password), { message: "missing_fields" })
      .safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const existing = users.find((u) => u.loja_id === lojaId && !u.is_admin);
    if (!existing) {
      if (!body.data.email || !body.data.password) {
        res.status(400).json({ error: "missing_fields" });
        return;
      }
      const email = body.data.email.toLowerCase();
      if (users.some((u) => u.email === email)) {
        res.status(409).json({ error: "email_in_use" });
        return;
      }
      const nextUserId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      users.push({ id: nextUserId, email, password: body.data.password, loja_id: lojaId, is_admin: false });
      res.json({ ok: true });
      return;
    }

    if (body.data.email) {
      const email = body.data.email.toLowerCase();
      if (users.some((u) => u.email === email && u.id !== existing.id)) {
        res.status(409).json({ error: "email_in_use" });
        return;
      }
      existing.email = email;
    }
    if (body.data.password) {
      existing.password = body.data.password;
    }

    res.json({ ok: true });
  });

  router.get("/dispositivos", (req, res) => {
    const parsed = z
      .object({
        id: z.coerce.number().int().positive().optional(),
        loja_id: z.coerce.number().int().positive().optional(),
        setor_id: z.coerce.number().int().positive().optional(),
        tipo_camera_id: z.coerce.number().int().positive().optional(),
        status: z.enum(["online", "offline"]).optional()
      })
      .safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }

    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    const list = dispositivos
      .filter((d) => (parsed.data.id ? d.id === parsed.data.id : true))
      .filter((d) => (parsed.data.loja_id ? d.loja_id === parsed.data.loja_id : true))
      .filter((d) => (lojaScope ? d.loja_id === lojaScope : true))
      .filter((d) => (parsed.data.setor_id ? d.setor_id === parsed.data.setor_id : true))
      .filter((d) => (parsed.data.tipo_camera_id ? d.tipo_camera_id === parsed.data.tipo_camera_id : true))
      .filter((d) => (parsed.data.status ? d.status === parsed.data.status : true))
      .map((d) => ({
        id: d.id,
        nome: d.nome,
        loja_id: d.loja_id,
        setor_id: d.setor_id,
        tipo_camera_id: d.tipo_camera_id,
        ip_camera: d.ip_camera,
        status: d.status,
        temperatura_atual: d.temperatura_atual,
        ultima_leitura_at: d.ultima_leitura_at,
        porta_status: d.porta_status,
        last_seen: d.last_seen,
        loja_nome: lojas.find((l) => l.id === d.loja_id)?.nome ?? "",
        setor_nome: setores.find((s) => s.id === d.setor_id)?.nome ?? "",
        tipo_camera_nome: tipos.find((t) => t.id === d.tipo_camera_id)?.nome ?? ""
      }))
      .sort((a, b) => a.loja_nome.localeCompare(b.loja_nome) || a.nome.localeCompare(b.nome));

    res.json(list);
  });

  router.post("/dispositivos", (req, res) => {
    const body = z
      .object({
        nome: z.string().min(1),
        loja_id: z.number().int().positive(),
        setor_id: z.number().int().positive(),
        tipo_camera_id: z.number().int().positive(),
        ip_camera: z.string().min(1).optional(),
        temperatura_min: z.number().optional(),
        temperatura_max: z.number().optional(),
        horarios: z.array(z.string().regex(/^\d{2}:\d{2}$/)).length(3).optional()
      })
      .safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    if (lojaScope && body.data.loja_id !== lojaScope) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const nextId = dispositivos.length ? Math.max(...dispositivos.map((d) => d.id)) + 1 : 1;
    const horarios = body.data.horarios ?? ["07:00", "15:00", "22:00"];
    dispositivos.push({
      id: nextId,
      nome: body.data.nome,
      loja_id: body.data.loja_id,
      setor_id: body.data.setor_id,
      tipo_camera_id: body.data.tipo_camera_id,
      ip_camera: body.data.ip_camera ?? null,
      status: "offline",
      temperatura_min: body.data.temperatura_min ?? null,
      temperatura_max: body.data.temperatura_max ?? null,
      horario_1: horarios[0],
      horario_2: horarios[1],
      horario_3: horarios[2],
      temperatura_atual: null,
      ultima_leitura_at: null,
      porta_status: "fechada",
      porta_aberta_em: null,
      last_seen: null
    });

    ensureResumo(resumos, nextId, today);
    res.status(201).json({ id: nextId });
  });

  router.get("/dashboard/cards", (req, res) => {
    const parsed = z
      .object({
        dispositivo_id: z.coerce.number().int().positive(),
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      })
      .safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }

    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    const d = dispositivos.find((x) => x.id === parsed.data.dispositivo_id && (!lojaScope || x.loja_id === lojaScope));
    if (!d) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const r = ensureResumo(resumos, d.id, parsed.data.data);
    res.json({
      dispositivo_id: d.id,
      temperatura_atual: d.temperatura_atual,
      ultima_leitura_at: d.ultima_leitura_at,
      porta_status: d.porta_status,
      tempo_aberto_hoje_segundos: r.tempo_total_aberto,
      total_aberturas_hoje: r.total_aberturas,
      total_alarmes_hoje: r.total_alarmes
    });
  });

  router.get("/leituras", (req, res) => {
    const parsed = z
      .object({
        dispositivo_id: z.coerce.number().int().positive().optional(),
        loja_id: z.coerce.number().int().positive().optional(),
        setor_id: z.coerce.number().int().positive().optional(),
        tipo_camera_id: z.coerce.number().int().positive().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        tipo_registro: z.enum(["automatico", "tempo_real"]).optional(),
        limit: z.coerce.number().int().positive().max(2000).default(500)
      })
      .safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }

    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    const deviceIds = dispositivos
      .filter((d) => (parsed.data.loja_id ? d.loja_id === parsed.data.loja_id : true))
      .filter((d) => (lojaScope ? d.loja_id === lojaScope : true))
      .filter((d) => (parsed.data.setor_id ? d.setor_id === parsed.data.setor_id : true))
      .filter((d) => (parsed.data.tipo_camera_id ? d.tipo_camera_id === parsed.data.tipo_camera_id : true))
      .map((d) => d.id);

    const fromT = parsed.data.from ? new Date(parsed.data.from).getTime() : null;
    const toT = parsed.data.to ? new Date(parsed.data.to).getTime() : null;

    const list = leituras
      .filter((l) => (parsed.data.dispositivo_id ? l.dispositivo_id === parsed.data.dispositivo_id : true))
      .filter((l) => (parsed.data.tipo_registro ? l.tipo_registro === parsed.data.tipo_registro : true))
      .filter((l) => (deviceIds.length ? deviceIds.includes(l.dispositivo_id) : true))
      .filter((l) => (fromT ? new Date(l.data_hora).getTime() >= fromT : true))
      .filter((l) => (toT ? new Date(l.data_hora).getTime() <= toT : true))
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
      .slice(0, parsed.data.limit)
      .map((l) => ({
        ...l,
        dispositivo_nome: dispositivos.find((d) => d.id === l.dispositivo_id)?.nome ?? ""
      }));

    res.json(list);
  });

  router.get("/eventos", (req, res) => {
    const parsed = z
      .object({
        dispositivo_id: z.coerce.number().int().positive().optional(),
        loja_id: z.coerce.number().int().positive().optional(),
        setor_id: z.coerce.number().int().positive().optional(),
        tipo_camera_id: z.coerce.number().int().positive().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        tipo_evento: z.enum(["porta_aberta", "porta_fechada", "alarme_disparado", "temperatura_fora_padrao"]).optional(),
        limit: z.coerce.number().int().positive().max(2000).default(500)
      })
      .safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }

    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    const deviceIds = dispositivos
      .filter((d) => (parsed.data.loja_id ? d.loja_id === parsed.data.loja_id : true))
      .filter((d) => (lojaScope ? d.loja_id === lojaScope : true))
      .filter((d) => (parsed.data.setor_id ? d.setor_id === parsed.data.setor_id : true))
      .filter((d) => (parsed.data.tipo_camera_id ? d.tipo_camera_id === parsed.data.tipo_camera_id : true))
      .map((d) => d.id);

    const fromT = parsed.data.from ? new Date(parsed.data.from).getTime() : null;
    const toT = parsed.data.to ? new Date(parsed.data.to).getTime() : null;

    const list = eventos
      .filter((e) => (parsed.data.dispositivo_id ? e.dispositivo_id === parsed.data.dispositivo_id : true))
      .filter((e) => (parsed.data.tipo_evento ? e.tipo_evento === parsed.data.tipo_evento : true))
      .filter((e) => (deviceIds.length ? deviceIds.includes(e.dispositivo_id) : true))
      .filter((e) => (fromT ? new Date(e.data_hora).getTime() >= fromT : true))
      .filter((e) => (toT ? new Date(e.data_hora).getTime() <= toT : true))
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
      .slice(0, parsed.data.limit)
      .map((e) => ({
        ...e,
        dispositivo_nome: dispositivos.find((d) => d.id === e.dispositivo_id)?.nome ?? ""
      }));

    res.json(list);
  });

  router.get("/resumo", (req, res) => {
    const parsed = z
      .object({
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dispositivo_id: z.coerce.number().int().positive().optional(),
        loja_id: z.coerce.number().int().positive().optional(),
        setor_id: z.coerce.number().int().positive().optional(),
        tipo_camera_id: z.coerce.number().int().positive().optional()
      })
      .safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }

    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    const deviceIds = dispositivos
      .filter((d) => (parsed.data.loja_id ? d.loja_id === parsed.data.loja_id : true))
      .filter((d) => (lojaScope ? d.loja_id === lojaScope : true))
      .filter((d) => (parsed.data.setor_id ? d.setor_id === parsed.data.setor_id : true))
      .filter((d) => (parsed.data.tipo_camera_id ? d.tipo_camera_id === parsed.data.tipo_camera_id : true))
      .map((d) => d.id);

    const list = resumos
      .filter((r) => r.data === parsed.data.data)
      .filter((r) => (parsed.data.dispositivo_id ? r.dispositivo_id === parsed.data.dispositivo_id : true))
      .filter((r) => (deviceIds.length ? deviceIds.includes(r.dispositivo_id) : true))
      .map((r) => ({
        ...r,
        dispositivo_nome: dispositivos.find((d) => d.id === r.dispositivo_id)?.nome ?? ""
      }))
      .sort((a, b) => a.dispositivo_nome.localeCompare(b.dispositivo_nome));

    res.json(list);
  });

  router.put("/dispositivos/:id/config", (req, res) => {
    const id = Number(req.params.id);
    const d = dispositivos.find((x) => x.id === id);
    if (!d) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const body = z
      .object({
        temperatura_min: z.number(),
        temperatura_max: z.number(),
        horarios: z.array(z.string().regex(/^\d{2}:\d{2}$/)).length(3)
      })
      .safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    if (lojaScope && d.loja_id !== lojaScope) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    d.temperatura_min = body.data.temperatura_min;
    d.temperatura_max = body.data.temperatura_max;
    d.horario_1 = body.data.horarios[0];
    d.horario_2 = body.data.horarios[1];
    d.horario_3 = body.data.horarios[2];

    res.json({ ok: true });
  });

  router.get("/dispositivos/:id/config", (req, res) => {
    const id = Number(req.params.id);
    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    const d = dispositivos.find((x) => x.id === id && (!lojaScope || x.loja_id === lojaScope));
    if (!d) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      temperatura_min: d.temperatura_min,
      temperatura_max: d.temperatura_max,
      horarios: [d.horario_1, d.horario_2, d.horario_3].filter(Boolean).map((h) => (h as string).slice(0, 5))
    });
  });

  // Aplicar configuração em massa para todos os dispositivos de uma loja
  router.put("/lojas/:id/apply-config", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const body = z
      .object({
        temperatura_min: z.number(),
        temperatura_max: z.number(),
        horarios: z.array(z.string().regex(/^\d{2}:\d{2}$/)).length(3)
      })
      .safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    if (lojaScope && lojaScope !== id) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    dispositivos.forEach((d) => {
      if (d.loja_id === id) {
        d.temperatura_min = body.data.temperatura_min;
        d.temperatura_max = body.data.temperatura_max;
        d.horario_1 = body.data.horarios[0];
        d.horario_2 = body.data.horarios[1];
        d.horario_3 = body.data.horarios[2];
      }
    });
    res.json({ ok: true });
  });

  router.put("/config/apply", (req, res) => {
    const body = z
      .object({
        temperatura_min: z.number(),
        temperatura_max: z.number(),
        horarios: z.array(z.string().regex(/^\d{2}:\d{2}$/)).length(3)
      })
      .safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const lojaScope = (req.auth?.lojaId as number | null) ?? null;
    dispositivos.forEach((d) => {
      if (!lojaScope || d.loja_id === lojaScope) {
        d.temperatura_min = body.data.temperatura_min;
        d.temperatura_max = body.data.temperatura_max;
        d.horario_1 = body.data.horarios[0];
        d.horario_2 = body.data.horarios[1];
        d.horario_3 = body.data.horarios[2];
      }
    });

    res.json({ ok: true });
  });

  return router;
}
