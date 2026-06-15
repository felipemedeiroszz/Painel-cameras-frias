import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/query";
import { pool } from "../../db/pool";
import { emitRealtimeEvent } from "../socket";
import { requireDeviceToken } from "../middleware/requireDeviceToken";

export const ingestRouter = Router();

ingestRouter.use(requireDeviceToken);

const TipoRegistroSchema = z.enum(["automatico", "tempo_real"]);
const TipoEventoSchema = z.enum([
  "porta_aberta",
  "porta_fechada",
  "alarme_disparado",
  "temperatura_fora_padrao",
  "botao_panico_ativado",
  "botao_panico_desativado"
]);

ingestRouter.get("/dispositivos/:id/config", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const [cfg] = await query<{
    temperatura_min: number | null;
    temperatura_max: number | null;
    horario_1: string | null;
    horario_2: string | null;
    horario_3: string | null;
  }>(
    "select temperatura_min, temperatura_max, horario_1, horario_2, horario_3 from dispositivos where id = $1",
    [id]
  );

  if (!cfg) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const horarios = [cfg.horario_1, cfg.horario_2, cfg.horario_3]
    .filter((h): h is string => Boolean(h))
    .map((h) => h.slice(0, 5));

  res.json({
    temperatura_min: cfg.temperatura_min,
    temperatura_max: cfg.temperatura_max,
    horarios
  });
});

function asSqlDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function touchOnline(dispositivoId: number): Promise<void> {
  await query(
    "update dispositivos set status = 'online', last_seen = now() where id = $1",
    [dispositivoId]
  );
}

async function ensureResumoDiario(dispositivoId: number, date: string): Promise<void> {
  await query(
    `
    insert into resumo_diario (dispositivo_id, data, total_aberturas, tempo_total_aberto, total_alarmes)
    values ($1, $2, 0, 0, 0)
    on conflict (dispositivo_id, data) do nothing
    `,
    [dispositivoId, date]
  );
}

ingestRouter.post("/leituras", async (req, res) => {
  const body = z
    .object({
      dispositivo_id: z.number().int().positive(),
      temperatura: z.number(),
      tipo_registro: TipoRegistroSchema,
      data_hora: z.string().datetime().optional()
    })
    .safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const dataHora = body.data.data_hora ? new Date(body.data.data_hora) : new Date();

  const client = await pool.connect();
  try {
    await client.query("begin");

    const leituraRows = await client.query<{
      id: number;
      dispositivo_id: number;
      temperatura: number;
      data_hora: string;
      tipo_registro: string;
    }>(
      `
      insert into leituras (dispositivo_id, temperatura, data_hora, tipo_registro)
      values ($1, $2, $3, $4)
      returning id, dispositivo_id, temperatura, data_hora, tipo_registro
      `,
      [body.data.dispositivo_id, body.data.temperatura, dataHora.toISOString(), body.data.tipo_registro]
    );

    await client.query(
      `
      update dispositivos
      set status = 'online',
          last_seen = now(),
          temperatura_atual = $2,
          ultima_leitura_at = $3
      where id = $1
      `,
      [body.data.dispositivo_id, body.data.temperatura, dataHora.toISOString()]
    );

    await client.query("select id from dispositivos where id = $1", [body.data.dispositivo_id]);

    await client.query("commit");

    const leitura = leituraRows.rows[0];
    emitRealtimeEvent("leitura:new", leitura);
    res.json({ ok: true, leitura });
  } catch {
    await client.query("rollback");
    res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

ingestRouter.post("/eventos", async (req, res) => {
  const body = z
    .object({
      dispositivo_id: z.number().int().positive(),
      tipo_evento: TipoEventoSchema,
      data_hora: z.string().datetime().optional(),
      duracao_segundos: z.number().int().nonnegative().optional()
    })
    .safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const dataHora = body.data.data_hora ? new Date(body.data.data_hora) : new Date();
  const date = asSqlDateString(dataHora);

  const client = await pool.connect();
  try {
    await client.query("begin");

    await client.query(
      `
      insert into eventos (dispositivo_id, tipo_evento, data_hora, duracao_segundos)
      values ($1, $2, $3, $4)
      `,
      [body.data.dispositivo_id, body.data.tipo_evento, dataHora.toISOString(), body.data.duracao_segundos ?? null]
    );

    await client.query(
      "update dispositivos set status = 'online', last_seen = now() where id = $1",
      [body.data.dispositivo_id]
    );

    await ensureResumoDiario(body.data.dispositivo_id, date);

    if (body.data.tipo_evento === "porta_aberta") {
      await client.query(
        `
        update dispositivos
        set porta_status = 'aberta',
            porta_aberta_em = $2
        where id = $1
        `,
        [body.data.dispositivo_id, dataHora.toISOString()]
      );
    }

    if (body.data.tipo_evento === "porta_fechada") {
      const portaRows = await client.query<{ porta_aberta_em: string | null }>(
        "select porta_aberta_em from dispositivos where id = $1",
        [body.data.dispositivo_id]
      );
      const portaAbertaEm = portaRows.rows[0]?.porta_aberta_em ? new Date(portaRows.rows[0].porta_aberta_em) : null;

      const duracao = portaAbertaEm ? Math.max(0, Math.floor((dataHora.getTime() - portaAbertaEm.getTime()) / 1000)) : 0;

      await client.query(
        `
        update dispositivos
        set porta_status = 'fechada',
            porta_aberta_em = null
        where id = $1
        `,
        [body.data.dispositivo_id]
      );

      await client.query(
        `
        update resumo_diario
        set total_aberturas = total_aberturas + 1,
            tempo_total_aberto = tempo_total_aberto + $3
        where dispositivo_id = $1 and data = $2
        `,
        [body.data.dispositivo_id, date, duracao]
      );
    }

    if (body.data.tipo_evento === "alarme_disparado") {
      await client.query(
        `
        update resumo_diario
        set total_alarmes = total_alarmes + 1
        where dispositivo_id = $1 and data = $2
        `,
        [body.data.dispositivo_id, date]
      );
    }

    if (body.data.tipo_evento === "temperatura_fora_padrao") {
      await client.query(
        `
        update resumo_diario
        set total_alarmes = total_alarmes + 1
        where dispositivo_id = $1 and data = $2
        `,
        [body.data.dispositivo_id, date]
      );
      emitRealtimeEvent("alert:new", {
        dispositivo_id: body.data.dispositivo_id,
        tipo: "temperatura_fora_padrao",
        data_hora: dataHora.toISOString()
      });
    }

    if (body.data.tipo_evento === "botao_panico_ativado") {
      emitRealtimeEvent("alert:new", {
        dispositivo_id: body.data.dispositivo_id,
        tipo: "botao_panico_ativado",
        data_hora: dataHora.toISOString()
      });
    }

    await client.query("commit");

    emitRealtimeEvent("evento:new", {
      dispositivo_id: body.data.dispositivo_id,
      tipo_evento: body.data.tipo_evento,
      data_hora: dataHora.toISOString(),
      duracao_segundos: body.data.duracao_segundos ?? null
    });

    res.json({ ok: true });
  } catch {
    await client.query("rollback");
    res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

ingestRouter.post("/resumo", async (req, res) => {
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

  await touchOnline(body.data.dispositivo_id);
  await query(
    `
    insert into resumo_diario (dispositivo_id, data, total_aberturas, tempo_total_aberto, total_alarmes)
    values ($1, $2, $3, $4, $5)
    on conflict (dispositivo_id, data) do update
    set total_aberturas = excluded.total_aberturas,
        tempo_total_aberto = excluded.tempo_total_aberto,
        total_alarmes = excluded.total_alarmes
    `,
    [
      body.data.dispositivo_id,
      body.data.data,
      body.data.total_aberturas,
      body.data.tempo_total_aberto,
      body.data.total_alarmes
    ]
  );

  emitRealtimeEvent("resumo:upsert", body.data);
  res.json({ ok: true });
});
