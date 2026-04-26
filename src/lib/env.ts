/* eslint-disable node/no-process-env */
import { loadEnv } from "@matthew-hre/env";
import * as z from "zod";

const schema = {
  server: z.object({
    DATABASE_URL: z.url(),
    WORKOS_API_KEY: z.string(),
    WORKOS_CLIENT_ID: z.string(),
    WORKOS_COOKIE_PASSWORD: z.string().min(32),
    ENCRYPTION_SECRET: z.string().min(32),
    ENCRYPTION_SALT: z.string().min(8),
    R2_PUBLIC_URL: z.url().optional(),
    RESEND_API_KEY: z.string(),
    OPENROUTER_API_KEY: z.string().optional(),
    TOOLING_OPENROUTER_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    POLAR_ACCESS_TOKEN: z.string().optional(),
    POLAR_SANDBOX: z.string().optional().transform(v => v === "true"),
    POLAR_WEBHOOK_SECRET: z.string().optional(),
    POLAR_SUCCESS_URL: z.url().optional(),
    POLAR_PLUS_PRODUCT_ID: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.url(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
  }),
  client: z.object({
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: z.url().optional(),
  }),
};

export type ServerEnvSchema = z.infer<typeof schema.server>;
export type ClientEnvSchema = z.infer<typeof schema.client>;

export const { serverEnv, clientEnv } = loadEnv(schema, process.env, {
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
