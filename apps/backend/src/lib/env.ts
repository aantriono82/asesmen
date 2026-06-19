import { config } from "dotenv";
import path from "node:path";
import { z } from "zod";

config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), "../../.env") });

const nonEmptyString = z.string().trim().min(1);

const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
    JWT_DOWNLOAD_EXPIRES_IN: z.string().default("1h"),
    BACKEND_PORT: z.coerce.number().int().positive().default(3100),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    FRONTEND_URL: z.string().url().default("http://localhost:3001"),
    SERVICE_NAME: z.string().default("atiga-backend"),
    PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
    EXPORT_STORAGE_PATH: nonEmptyString.default("./exports"),
    SENTRY_DSN: z.string().url().optional(),
    AI_DEFAULT_PROVIDER: z.enum(["openai", "anthropic", "google", "deepseek"]).optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default("gpt-4o"),
    OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
    GOOGLE_API_KEY: z.string().optional(),
    GOOGLE_MODEL: z.string().default("gemini-1.5-pro"),
    DEEPSEEK_API_KEY: z.string().optional(),
    DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_PATH: nonEmptyString.default("./uploads"),
    STORAGE_PUBLIC_BASE_URL: z.string().url().optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_REGION: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_DRIVER === "s3") {
      const requiredKeys = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_REGION"] as const;

      for (const key of requiredKeys) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} wajib diisi saat STORAGE_DRIVER=s3`
          });
        }
      }
    }
  });

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
}

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Environment validation failed\n${formatIssues(parsedEnv.error)}`);
}

export const env = parsedEnv.data;
