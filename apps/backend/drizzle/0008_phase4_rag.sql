ALTER TYPE "public"."document_status" RENAME VALUE 'uploaded' TO 'pending';
--> statement-breakpoint
ALTER TYPE "public"."document_status" RENAME VALUE 'processed' TO 'completed';
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "file_url" text;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "error_message" text;
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN IF NOT EXISTS "page_number" integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_bases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_base_documents" (
  "knowledge_base_id" uuid NOT NULL,
  "document_id" uuid NOT NULL,
  "added_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "knowledge_base_documents_pk" PRIMARY KEY("knowledge_base_id","document_id")
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "knowledge_base_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_base_documents" ADD CONSTRAINT "knowledge_base_documents_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_base_documents" ADD CONSTRAINT "knowledge_base_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessments" ADD CONSTRAINT "assessments_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_ivfflat_idx" ON "document_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_bases_user_id_idx" ON "knowledge_bases" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_bases_created_at_idx" ON "knowledge_bases" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_base_documents_document_id_idx" ON "knowledge_base_documents" USING btree ("document_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_sessions_knowledge_base_id_idx" ON "chat_sessions" USING btree ("knowledge_base_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessments_knowledge_base_id_idx" ON "assessments" USING btree ("knowledge_base_id");
