ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "session_id" varchar(128);
--> statement-breakpoint
UPDATE "sessions"
SET "session_id" = "id"::text
WHERE "session_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "session_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_session_id_unique" UNIQUE("session_id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
UPDATE "sessions"
SET "updated_at" = COALESCE("updated_at", "created_at", now())
WHERE "updated_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_session_id_idx" ON "sessions" USING btree ("session_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limits" (
  "key" varchar(255) PRIMARY KEY NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "window_start" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ALTER COLUMN "key" TYPE varchar(255);
--> statement-breakpoint
ALTER TABLE "rate_limits" ADD COLUMN IF NOT EXISTS "window_start" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "rate_limits" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
ALTER TABLE "rate_limits" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rate_limits'
      AND column_name = 'expires_at'
  ) THEN
    EXECUTE $sql$
      UPDATE "rate_limits"
      SET
        "window_start" = COALESCE("window_start", "expires_at", now()),
        "created_at" = COALESCE("created_at", now()),
        "updated_at" = COALESCE("updated_at", now())
      WHERE "window_start" IS NULL
         OR "created_at" IS NULL
         OR "updated_at" IS NULL
    $sql$;
  ELSE
    UPDATE "rate_limits"
    SET
      "window_start" = COALESCE("window_start", now()),
      "created_at" = COALESCE("created_at", now()),
      "updated_at" = COALESCE("updated_at", now())
    WHERE "window_start" IS NULL
       OR "created_at" IS NULL
       OR "updated_at" IS NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "rate_limits" ALTER COLUMN "window_start" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "rate_limits" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "rate_limits" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "rate_limits" DROP COLUMN IF EXISTS "expires_at";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_created_at_idx" ON "rate_limits" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_window_start_idx" ON "rate_limits" USING btree ("window_start");
