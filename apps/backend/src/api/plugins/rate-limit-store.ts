import type { Pool } from "pg";
import type { RouteOptions } from "fastify";

interface IncrementResult {
  current: number;
  ttl: number;
}

interface RateLimitStore {
  incr(key: string, callback: (error: Error | null, result?: IncrementResult) => void): void;
  child(routeOptions: RouteOptions & { path: string; prefix: string }): RateLimitStore;
}

export class PgRateLimitStore implements RateLimitStore {
  private static pool: Pool | null = null;
  private static windowMs = 60_000;

  private readonly pool: Pool;
  private readonly windowMs: number;

  public constructor() {
    if (!PgRateLimitStore.pool) {
      throw new Error("PgRateLimitStore has not been configured");
    }

    this.pool = PgRateLimitStore.pool;
    this.windowMs = PgRateLimitStore.windowMs;
  }

  public static configure(pool: Pool, windowMs = 60_000): void {
    PgRateLimitStore.pool = pool;
    PgRateLimitStore.windowMs = windowMs;
  }

  public static async init(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key varchar(255) PRIMARY KEY,
        count integer NOT NULL DEFAULT 0,
        window_start timestamp with time zone NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `);
  }

  public incr(key: string, callback: (error: Error | null, result?: IncrementResult) => void): void {
    this.increment(key)
      .then((result) => callback(null, result))
      .catch((error: unknown) => {
        callback(error instanceof Error ? error : new Error("Rate limit store error"));
      });
  }

  public child(routeOptions: RouteOptions & { path: string; prefix: string }): RateLimitStore {
    void routeOptions;
    return this;
  }

  private async increment(key: string): Promise<IncrementResult> {
    const result = await this.pool.query<{ count: number; ttl_ms: string }>(
      `
      WITH upserted AS (
        INSERT INTO rate_limits (key, count, window_start, created_at, updated_at)
        VALUES ($1, 1, now(), now(), now())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE
            WHEN rate_limits.window_start < now() - ($2::text || ' milliseconds')::interval THEN 1
            ELSE rate_limits.count + 1
          END,
          window_start = CASE
            WHEN rate_limits.window_start < now() - ($2::text || ' milliseconds')::interval THEN now()
            ELSE rate_limits.window_start
          END
          ,
          updated_at = now()
        RETURNING
          count,
          GREATEST(
            $2::int - FLOOR(EXTRACT(EPOCH FROM (now() - window_start)) * 1000)::int,
            0
          ) AS ttl_ms
      )
      SELECT count, ttl_ms FROM upserted
      `,
      [key, this.windowMs]
    );

    const row = result.rows[0];
    return {
      current: row?.count ?? 1,
      ttl: Number(row?.ttl_ms ?? this.windowMs)
    };
  }
}
