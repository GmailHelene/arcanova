import { Pool } from "pg";
import { SCHEMA_SQL } from "./schema";

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

export async function initSchema() {
  await pool.query(SCHEMA_SQL);
  console.log("Database schema is ready.");
}
