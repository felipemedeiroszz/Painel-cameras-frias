import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "../db/pool";

async function main(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, "..", "..", "migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        run_at timestamptz not null default now()
      )
    `);

    const appliedRows = await client.query<{ filename: string }>(
      "select filename from schema_migrations order by filename"
    );
    const applied = new Set(appliedRows.rows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) continue;

      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, "utf8");

      process.stdout.write(`[migrate] ${file}... `);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (filename) values ($1)", [file]);
        await client.query("commit");
        process.stdout.write("ok\n");
      } catch (e) {
        await client.query("rollback");
        process.stdout.write("failed\n");
        throw e;
      }
    }

    process.stdout.write("[migrate] done\n");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

