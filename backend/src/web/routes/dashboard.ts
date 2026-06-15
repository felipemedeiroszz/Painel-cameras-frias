import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/query";
import { pool } from "../../db/pool";
import { requireAuth } from "../middleware/requireAuth";
import { hashPassword } from "../../auth/password";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

function getLojaScope(req: Request): number | null {
  const auth = req.auth;
  if (!auth) return null;
  if (auth.isAdmin) return null;
  return auth.lojaId ?? null;
}

dashboardRouter.put("/config/apply", async (req, res) => {
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

  const lojaScope = getLojaScope(req);

  if (lojaScope) {
    await query(
      `
      update dispositivos
      set temperatura_min = $2,
          temperatura_max = $3,
          horario_1 = $4,
          horario_2 = $5,
          horario_3 = $6
      where loja_id = $1
      `,
      [
        lojaScope,
        body.data.temperatura_min,
        body.data.temperatura_max,
        body.data.horarios[0],
        body.data.horarios[1],
        body.data.horarios[2]
      ]
    );
  } else {
    await query(
      `
      update dispositivos
      set temperatura_min = $1,
          temperatura_max = $2,
          horario_1 = $3,
          horario_2 = $4,
          horario_3 = $5
      `,
      [
        body.data.temperatura_min,
        body.data.temperatura_max,
        body.data.horarios[0],
        body.data.horarios[1],
        body.data.horarios[2]
      ]
    );
  }

  res.json({ ok: true });
});

dashboardRouter.put("/lojas/:id/apply-config", async (req, res) => {
  const lojaScope = getLojaScope(req);
  if (lojaScope) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
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
  await query(
    `
    update dispositivos
    set temperatura_min = $2,
        temperatura_max = $3,
        horario_1 = $4,
        horario_2 = $5,
        horario_3 = $6
    where loja_id = $1
    `,
    [id, body.data.temperatura_min, body.data.temperatura_max, body.data.horarios[0], body.data.horarios[1], body.data.horarios[2]]
  );
  res.json({ ok: true });
});

dashboardRouter.get("/lojas", async (_req, res) => {
  const lojaScope = getLojaScope(_req);
  const params: unknown[] = [];
  const where = lojaScope ? "where l.id = $1" : "";
  if (lojaScope) params.push(lojaScope);

  const lojas = await query<{ id: number; nome: string; cidade: string; estado: string; login_email: string | null }>(
    `
    select
      l.id,
      l.nome,
      l.cidade,
      l.estado,
      u.email as login_email
    from lojas l
    left join users u on u.loja_id = l.id and u.is_admin = false
    ${where}
    order by l.nome
    `,
    params
  );
  res.json(lojas);
});

dashboardRouter.post("/lojas", async (req, res) => {
  const lojaScope = getLojaScope(req);
  if (lojaScope) {
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

  const client = await pool.connect();
  try {
    await client.query("begin");
    const lojaInsert = await client.query<{ id: number }>(
      "insert into lojas (nome, cidade, estado) values ($1, $2, $3) returning id",
      [body.data.nome, body.data.cidade, body.data.estado.toUpperCase()]
    );
    const lojaId = lojaInsert.rows[0]?.id;
    const passwordHash = await hashPassword(body.data.password);
    await client.query(
      "insert into users (email, password_hash, loja_id, is_admin) values ($1, $2, $3, false)",
      [body.data.email.toLowerCase(), passwordHash, lojaId]
    );
    await client.query("commit");
    res.status(201).json({ id: lojaId });
  } catch (e: unknown) {
    await client.query("rollback");
    const code =
      typeof e === "object" && e && "code" in e ? String((e as { code?: unknown }).code) : null;
    if (code === "23505") {
      res.status(409).json({ error: "email_in_use" });
      return;
    }
    res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

dashboardRouter.put("/lojas/:id/credentials", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const lojaScope = getLojaScope(req);
  if (lojaScope && lojaScope !== id) {
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

  const client = await pool.connect();
  try {
    await client.query("begin");
    const userRows = await client.query<{ id: number; email: string }>(
      "select id, email from users where loja_id = $1 and is_admin = false limit 1",
      [id]
    );
    const existing = userRows.rows[0];

    if (!existing) {
      if (!body.data.email || !body.data.password) {
        res.status(400).json({ error: "missing_fields" });
        await client.query("rollback");
        return;
      }
      const passwordHash = await hashPassword(body.data.password);
      await client.query(
        "insert into users (email, password_hash, loja_id, is_admin) values ($1, $2, $3, false)",
        [body.data.email.toLowerCase(), passwordHash, id]
      );
    } else {
      if (body.data.email) {
        await client.query("update users set email = $2 where id = $1", [existing.id, body.data.email.toLowerCase()]);
      }
      if (body.data.password) {
        const passwordHash = await hashPassword(body.data.password);
        await client.query("update users set password_hash = $2 where id = $1", [existing.id, passwordHash]);
      }
    }

    await client.query("commit");
    res.json({ ok: true });
  } catch (e: unknown) {
    await client.query("rollback");
    const code =
      typeof e === "object" && e && "code" in e ? String((e as { code?: unknown }).code) : null;
    if (code === "23505") {
      res.status(409).json({ error: "email_in_use" });
      return;
    }
    res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

dashboardRouter.get("/setores", async (_req, res) => {
  const setores = await query<{ id: number; nome: string }>("select id, nome from setores order by nome");
  res.json(setores);
});

dashboardRouter.get("/tipos-camera", async (_req, res) => {
  const tipos = await query<{ id: number; nome: string }>(
    "select id, nome from tipos_camera order by nome"
  );
  res.json(tipos);
});

dashboardRouter.get("/dispositivos", async (req, res) => {
  const lojaScope = getLojaScope(req);
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

  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace("?", `$${params.length}`));
  };

  if (parsed.data.id) add("d.id = ?", parsed.data.id);
  if (parsed.data.loja_id) add("d.loja_id = ?", parsed.data.loja_id);
  if (lojaScope) add("d.loja_id = ?", lojaScope);
  if (parsed.data.setor_id) add("d.setor_id = ?", parsed.data.setor_id);
  if (parsed.data.tipo_camera_id) add("d.tipo_camera_id = ?", parsed.data.tipo_camera_id);
  if (parsed.data.status) add("d.status = ?", parsed.data.status);

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const dispositivos = await query<{
    id: number;
    nome: string;
    loja_id: number;
    setor_id: number;
    tipo_camera_id: number;
    ip_camera: string | null;
    status: "online" | "offline";
    temperatura_atual: number | null;
    ultima_leitura_at: string | null;
    porta_status: "aberta" | "fechada" | null;
    last_seen: string | null;
    loja_nome: string;
    setor_nome: string;
    tipo_camera_nome: string;
  }>(
    `
    select
      d.id,
      d.nome,
      d.loja_id,
      d.setor_id,
      d.tipo_camera_id,
      d.ip_camera,
      d.status,
      d.temperatura_atual,
      d.ultima_leitura_at,
      d.porta_status,
      d.last_seen,
      l.nome as loja_nome,
      s.nome as setor_nome,
      tc.nome as tipo_camera_nome
    from dispositivos d
    join lojas l on l.id = d.loja_id
    join setores s on s.id = d.setor_id
    join tipos_camera tc on tc.id = d.tipo_camera_id
    ${where}
    order by l.nome, d.nome
    `,
    params
  );

  res.json(dispositivos);
});

dashboardRouter.post("/dispositivos", async (req, res) => {
  const lojaScope = getLojaScope(req);
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
  if (lojaScope && body.data.loja_id !== lojaScope) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const horarios = body.data.horarios ?? ["07:00", "15:00", "22:00"];
  const [row] = await query<{ id: number }>(
    `
    insert into dispositivos (
      nome, loja_id, setor_id, tipo_camera_id, ip_camera,
      temperatura_min, temperatura_max, horario_1, horario_2, horario_3,
      status, porta_status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'offline','fechada')
    returning id
    `,
    [
      body.data.nome,
      body.data.loja_id,
      body.data.setor_id,
      body.data.tipo_camera_id,
      body.data.ip_camera ?? null,
      body.data.temperatura_min ?? null,
      body.data.temperatura_max ?? null,
      horarios[0],
      horarios[1],
      horarios[2]
    ]
  );

  res.status(201).json({ id: row?.id });
});

dashboardRouter.get("/dispositivos/:id/config", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const lojaScope = getLojaScope(req);
  const [cfg] = await query<{
    temperatura_min: number | null;
    temperatura_max: number | null;
    horario_1: string | null;
    horario_2: string | null;
    horario_3: string | null;
  }>(
    `
    select temperatura_min, temperatura_max, horario_1, horario_2, horario_3
    from dispositivos
    where id = $1
      and ($2::int is null or loja_id = $2)
    `,
    [id, lojaScope]
  );

  if (!cfg) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const horarios = [cfg.horario_1, cfg.horario_2, cfg.horario_3].filter(
    (h): h is string => Boolean(h)
  );

  res.json({
    temperatura_min: cfg.temperatura_min,
    temperatura_max: cfg.temperatura_max,
    horarios: horarios.map((h) => h.slice(0, 5))
  });
});

dashboardRouter.put("/dispositivos/:id/config", async (req, res) => {
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

  const lojaScope = getLojaScope(req);
  await query(
    `
    update dispositivos
    set temperatura_min = $2,
        temperatura_max = $3,
        horario_1 = $4,
        horario_2 = $5,
        horario_3 = $6
    where id = $1
      and ($7::int is null or loja_id = $7)
    `,
    [
      id,
      body.data.temperatura_min,
      body.data.temperatura_max,
      body.data.horarios[0],
      body.data.horarios[1],
      body.data.horarios[2],
      lojaScope
    ]
  );

  res.json({ ok: true });
});

dashboardRouter.get("/leituras", async (req, res) => {
  const lojaScope = getLojaScope(req);
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

  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace("?", `$${params.length}`));
  };

  if (parsed.data.dispositivo_id) add("l.dispositivo_id = ?", parsed.data.dispositivo_id);
  if (parsed.data.tipo_registro) add("l.tipo_registro = ?", parsed.data.tipo_registro);
  if (parsed.data.from) add("l.data_hora >= ?", parsed.data.from);
  if (parsed.data.to) add("l.data_hora <= ?", parsed.data.to);

  if (parsed.data.loja_id) add("d.loja_id = ?", parsed.data.loja_id);
  if (lojaScope) add("d.loja_id = ?", lojaScope);
  if (parsed.data.setor_id) add("d.setor_id = ?", parsed.data.setor_id);
  if (parsed.data.tipo_camera_id) add("d.tipo_camera_id = ?", parsed.data.tipo_camera_id);

  params.push(parsed.data.limit);
  const limitParam = `$${params.length}`;

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const leituras = await query<{
    id: number;
    dispositivo_id: number;
    temperatura: number;
    data_hora: string;
    tipo_registro: "automatico" | "tempo_real";
    dispositivo_nome: string;
  }>(
    `
    select
      l.id,
      l.dispositivo_id,
      l.temperatura,
      l.data_hora,
      l.tipo_registro,
      d.nome as dispositivo_nome
    from leituras l
    join dispositivos d on d.id = l.dispositivo_id
    ${where}
    order by l.data_hora desc
    limit ${limitParam}
    `,
    params
  );

  res.json(leituras);
});

dashboardRouter.get("/eventos", async (req, res) => {
  const lojaScope = getLojaScope(req);
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

  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace("?", `$${params.length}`));
  };

  if (parsed.data.dispositivo_id) add("e.dispositivo_id = ?", parsed.data.dispositivo_id);
  if (parsed.data.tipo_evento) add("e.tipo_evento = ?", parsed.data.tipo_evento);
  if (parsed.data.from) add("e.data_hora >= ?", parsed.data.from);
  if (parsed.data.to) add("e.data_hora <= ?", parsed.data.to);
  if (parsed.data.loja_id) add("d.loja_id = ?", parsed.data.loja_id);
  if (lojaScope) add("d.loja_id = ?", lojaScope);
  if (parsed.data.setor_id) add("d.setor_id = ?", parsed.data.setor_id);
  if (parsed.data.tipo_camera_id) add("d.tipo_camera_id = ?", parsed.data.tipo_camera_id);

  params.push(parsed.data.limit);
  const limitParam = `$${params.length}`;

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const eventos = await query<{
    id: number;
    dispositivo_id: number;
    tipo_evento: string;
    data_hora: string;
    duracao_segundos: number | null;
    dispositivo_nome: string;
  }>(
    `
    select
      e.id,
      e.dispositivo_id,
      e.tipo_evento,
      e.data_hora,
      e.duracao_segundos,
      d.nome as dispositivo_nome
    from eventos e
    join dispositivos d on d.id = e.dispositivo_id
    ${where}
    order by e.data_hora desc
    limit ${limitParam}
    `,
    params
  );

  res.json(eventos);
});

dashboardRouter.get("/resumo", async (req, res) => {
  const lojaScope = getLojaScope(req);
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

  const conditions: string[] = ["r.data = $1"];
  const params: unknown[] = [parsed.data.data];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace("?", `$${params.length}`));
  };

  if (parsed.data.dispositivo_id) add("r.dispositivo_id = ?", parsed.data.dispositivo_id);
  if (parsed.data.loja_id) add("d.loja_id = ?", parsed.data.loja_id);
  if (lojaScope) add("d.loja_id = ?", lojaScope);
  if (parsed.data.setor_id) add("d.setor_id = ?", parsed.data.setor_id);
  if (parsed.data.tipo_camera_id) add("d.tipo_camera_id = ?", parsed.data.tipo_camera_id);

  const where = `where ${conditions.join(" and ")}`;

  const rows = await query<{
    id: number;
    dispositivo_id: number;
    data: string;
    total_aberturas: number;
    tempo_total_aberto: number;
    total_alarmes: number;
    dispositivo_nome: string;
  }>(
    `
    select
      r.id,
      r.dispositivo_id,
      r.data,
      r.total_aberturas,
      r.tempo_total_aberto,
      r.total_alarmes,
      d.nome as dispositivo_nome
    from resumo_diario r
    join dispositivos d on d.id = r.dispositivo_id
    ${where}
    order by d.nome
    `,
    params
  );

  res.json(rows);
});

dashboardRouter.get("/dashboard/cards", async (req, res) => {
  const lojaScope = getLojaScope(req);
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

  const [device] = await query<{
    id: number;
    temperatura_atual: number | null;
    ultima_leitura_at: string | null;
    porta_status: "aberta" | "fechada" | null;
  }>(
    `
    select id, temperatura_atual, ultima_leitura_at, porta_status
    from dispositivos
    where id = $1
      and ($2::int is null or loja_id = $2)
    `,
    [parsed.data.dispositivo_id, lojaScope]
  );

  const [resumo] = await query<{
    total_aberturas: number;
    tempo_total_aberto: number;
    total_alarmes: number;
  }>(
    `
    select r.total_aberturas, r.tempo_total_aberto, r.total_alarmes
    from resumo_diario r
    join dispositivos d on d.id = r.dispositivo_id
    where r.dispositivo_id = $1
      and r.data = $2
      and ($3::int is null or d.loja_id = $3)
    `,
    [parsed.data.dispositivo_id, parsed.data.data, lojaScope]
  );

  res.json({
    dispositivo_id: parsed.data.dispositivo_id,
    temperatura_atual: device?.temperatura_atual ?? null,
    ultima_leitura_at: device?.ultima_leitura_at ?? null,
    porta_status: device?.porta_status ?? null,
    tempo_aberto_hoje_segundos: resumo?.tempo_total_aberto ?? 0,
    total_aberturas_hoje: resumo?.total_aberturas ?? 0,
    total_alarmes_hoje: resumo?.total_alarmes ?? 0
  });
});
