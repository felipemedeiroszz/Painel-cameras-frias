import { pool } from "../db/pool";

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    const deviceRows = await client.query<{
      id: number;
      temperatura_min: number | null;
      temperatura_max: number | null;
    }>("select id, temperatura_min, temperatura_max from dispositivos order by id");

    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const date = `${yyyy}-${mm}-${dd}`;

    for (const d of deviceRows.rows) {
      const existing = await client.query<{ count: string }>(
        "select count(*) as count from leituras where dispositivo_id = $1 and data_hora::date = $2::date",
        [d.id, date]
      );
      if (Number(existing.rows[0]?.count ?? "0") > 0) continue;

      const baseMin = d.temperatura_min ?? -5;
      const baseMax = d.temperatura_max ?? 5;
      const center = (baseMin + baseMax) / 2;

      for (let h = 0; h < 24; h += 1) {
        const dt = new Date(Date.UTC(yyyy, Number(mm) - 1, Number(dd), h, 0, 0));
        const temp = Number((randomBetween(center - 1.5, center + 1.5)).toFixed(1));
        await client.query(
          `
          insert into leituras (dispositivo_id, temperatura, data_hora, tipo_registro)
          values ($1, $2, $3, 'automatico')
          `,
          [d.id, temp, dt.toISOString()]
        );
      }

      await client.query(
        `
        insert into resumo_diario (dispositivo_id, data, total_aberturas, tempo_total_aberto, total_alarmes)
        values ($1, $2, 3, 180, 1)
        on conflict (dispositivo_id, data) do nothing
        `,
        [d.id, date]
      );
    }

    process.stdout.write("[seed] ok\n");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

