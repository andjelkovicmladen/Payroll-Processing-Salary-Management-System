import { z } from "zod";

/**
 * Runtime-validated environment variables.
 *
 * Importing this module fails fast at startup if required configuration is
 * missing or malformed, rather than surfacing confusing errors deep in a
 * request handler. Never read `process.env` directly elsewhere — import `env`.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  COMPANY_NAME: z.string().default("Acme Payroll Inc."),
  COMPANY_ADDRESS: z.string().default(""),
  COMPANY_TAX_ID: z.string().default(""),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
