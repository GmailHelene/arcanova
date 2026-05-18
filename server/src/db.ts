import { Pool } from "pg";
import { MIGRATIONS } from "./migrations";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "DATABASE_URL is not set. Copy .env.example to .env (see README in chat).",
  );
  process.exit(1);
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export function query(text: string, params?: unknown[]) {
  return pool.query(text, params as unknown[]);
}

// Applies any migrations that have not run yet. Each runs once, inside a
// transaction, and is recorded in schema_migrations.
export async function runMigrations() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name       TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  const applied = await pool.query<{ name: string }>(
    `SELECT name FROM schema_migrations`,
  );
  const done = new Set(applied.rows.map((r) => r.name));

  for (const migration of MIGRATIONS) {
    if (done.has(migration.name)) continue;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(migration.sql);
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [
        migration.name,
      ]);
      await client.query("COMMIT");
      console.log(`Applied migration ${migration.name}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  console.log("Database is up to date.");
}
