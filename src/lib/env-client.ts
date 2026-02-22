/* eslint-disable node/no-process-env */
/**
 * Client environment variables.
 * No Zod to avoid bundling 700KB+ into the client.
 * Validation happens at build time via env.ts (server-side).
 */

function getClientEnv() {
  const NEXT_PUBLIC_BETTER_AUTH_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

  return {
    NEXT_PUBLIC_BETTER_AUTH_URL,
  };
}

export const clientEnv = getClientEnv();

export type ClientEnvSchema = typeof clientEnv;
