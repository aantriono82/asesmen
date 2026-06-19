DO $$ BEGIN
 CREATE TYPE "public"."assessment_status" AS ENUM('draft', 'published', 'archived', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'multiple_choice_complex', 'essay', 'true_false', 'matching', 'fill_blank');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."question_difficulty" AS ENUM('mudah', 'sedang', 'sulit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."curriculum_type" AS ENUM('silabus', 'rpp', 'prota', 'prosem', 'kisi_kisi');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."generated_document_type" AS ENUM('question_paper', 'answer_key', 'answer_sheet', 'scoring_rubric');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "subject" text,
  "grade_level" text,
  "assessment_type" text,
  "duration_minutes" integer,
  "instructions" text,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "assessment_status" DEFAULT 'draft' NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "assessment_id" uuid NOT NULL,
  "question_number" integer NOT NULL,
  "type" "question_type" NOT NULL,
  "content" text NOT NULL,
  "options" jsonb,
  "correct_answer" text,
  "explanation" text,
  "difficulty" "question_difficulty",
  "cognitive_level" text,
  "score" integer DEFAULT 1 NOT NULL,
  "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "source" text DEFAULT 'ai_generated' NOT NULL,
  "generated_by_skill" text,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "question_bank" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "subject" text,
  "grade_level" text,
  "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "curricula" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "type" "curriculum_type" NOT NULL,
  "subject" text,
  "grade_level" text,
  "semester" text,
  "academic_year" text,
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generated_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "assessment_id" uuid,
  "type" "generated_document_type" NOT NULL,
  "title" text,
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "curricula" ADD CONSTRAINT "curricula_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessments_user_id_idx" ON "assessments" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessments_subject_idx" ON "assessments" USING btree ("subject");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessments_status_idx" ON "assessments" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessments_created_at_idx" ON "assessments" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_assessment_id_idx" ON "questions" USING btree ("assessment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_type_idx" ON "questions" USING btree ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_difficulty_idx" ON "questions" USING btree ("difficulty");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_question_number_idx" ON "questions" USING btree ("assessment_id","question_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_bank_user_id_idx" ON "question_bank" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_bank_question_id_idx" ON "question_bank" USING btree ("question_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_bank_subject_idx" ON "question_bank" USING btree ("subject");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_bank_grade_level_idx" ON "question_bank" USING btree ("grade_level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "curricula_user_id_idx" ON "curricula" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "curricula_type_idx" ON "curricula" USING btree ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "curricula_subject_idx" ON "curricula" USING btree ("subject");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "curricula_created_at_idx" ON "curricula" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_user_id_idx" ON "generated_documents" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_assessment_id_idx" ON "generated_documents" USING btree ("assessment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_documents_type_idx" ON "generated_documents" USING btree ("type");
