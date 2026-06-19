import { drizzle } from "drizzle-orm/node-postgres";
import { closeDatabaseConnection, pool } from "./connection";
import * as schema from "./schema";

export const db = drizzle(pool, { schema });

export async function databaseHealthCheck(): Promise<"ok" | "error"> {
  try {
    const result = await pool.query<{ ok: number }>("select 1 as ok");
    return result.rows[0]?.ok === 1 ? "ok" : "error";
  } catch {
    return "error";
  }
}

export async function shutdownDatabase(): Promise<void> {
  await closeDatabaseConnection();
}
