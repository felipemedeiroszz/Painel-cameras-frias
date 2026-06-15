import { pool } from "../db/pool";
import { env } from "../shared/env";
import { emitRealtimeEvent } from "../web/socket";

export function startOfflineMonitor(): void {
  const intervalMs = 30_000;

  setInterval(async () => {
    const client = await pool.connect();
    try {
      const result = await client.query<{ id: number }>(
        `
        update dispositivos
        set status = 'offline'
        where last_seen is not null
          and last_seen < (now() - make_interval(secs => $1))
          and status <> 'offline'
        returning id
        `,
        [env.OFFLINE_AFTER_SECONDS]
      );

      if (result.rows.length) {
        emitRealtimeEvent("dispositivo:offline", { ids: result.rows.map((r) => r.id) });
      }
    } catch (e) {
      console.error(e);
    } finally {
      client.release();
    }
  }, intervalMs);
}
