import { Pool } from "pg";
import { env } from "@lib/env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await pool.query<{ ok: number }>("select 1 as ok");
    return result.rows[0]?.ok === 1;
  } catch {
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
}
