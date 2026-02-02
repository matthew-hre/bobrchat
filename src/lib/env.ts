import { loadEnv } from "@matthew-hre/env";
import * as z from "zod";

const schema = {
  server: z.object({
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    ENCRYPTION_SECRET: z.string().min(32),
    ENCRYPTION_SALT: z.string().min(8),
    R2_ACCOUNT_ID: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_BUCKET_NAME: z.string(),
    R2_PUBLIC_URL: z.url(),
    RESEND_API_KEY: z.string(),
  }),
  client: z.object({
    NEXT_PUBLIC_BETTER_AUTH_URL: z.url().optional(),
  }),
};

export type ServerEnvSchema = z.infer<typeof schema.server>;
export type ClientEnvSchema = z.infer<typeof schema.client>;

export const { serverEnv, clientEnv } = loadEnv(schema, process.env, {
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
