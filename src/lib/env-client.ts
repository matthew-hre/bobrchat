/**
 * Client environment variables.
 * No Zod to avoid bundling 700KB+ into the client.
 * Validation happens at build time via env.ts (server-side).
 */

function getClientEnv() {
  return {};
}

export const clientEnv = getClientEnv();

export type ClientEnvSchema = typeof clientEnv;
