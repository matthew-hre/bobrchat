import { loadEnv } from "@matthew-hre/env";
import { z } from "zod";

const schema = {
  server: z.object({
    NODE_ENV: z.enum(["development", "production"]),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    ENCRYPTION_KEY: z.string().min(32),
    OPENROUTER_API_KEY: z.string(),
  }),
  client: z.object({
    NEXT_PUBLIC_BETTER_AUTH_URL: z.url().optional(),
  }),
};

export type ServerEnvSchema = z.infer<typeof schema.server>;
export type ClientEnvSchema = z.infer<typeof schema.client>;

export const { serverEnv, clientEnv } = loadEnv(schema);
