/* eslint-disable node/no-process-env */
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeonWs } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cache } from "react";

import { serverEnv } from "~/lib/env";

import * as schema from "./schema";

// Check if error is transient (can be retried)
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // SQLSTATE 57P01: admin_shutdown (Neon compute restart)
    // SQLSTATE 08006: connection_failure
    // SQLSTATE 08003: connection_does_not_exist
    return (
      msg.includes("57p01")
      || msg.includes("admin")
      || msg.includes("connection")
      || msg.includes("terminated")
      || msg.includes("client has encountered")
    );
  }
  return false;
}

/**
 * Get a database client scoped to the current request.
 * Uses React.cache() to deduplicate within a single request/render.
 * On Cloudflare Workers, connection pooling across requests is not allowed,
 * so each request gets its own pool instance.
 */
export const getDb = cache(() => {
  if (process.env.NODE_ENV === "development") {
    const client = postgres(serverEnv.DATABASE_URL, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 10,
    });
    return drizzlePostgres({ client, casing: "snake_case", schema });
  }

  // Use Pool (WebSocket) instead of neon (HTTP) for transaction support.
  const pool = new Pool({
    connectionString: serverEnv.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Don't reuse connections across requests (required for Cloudflare Workers)
    maxUses: 1,
  });

  // Gracefully handle Neon compute restarts and connection errors
  pool.on("error", (error: Error) => {
    if (isTransientError(error)) {
      console.warn("[DB] Transient connection error (will retry):", error.message);
    }
    else {
      console.error("[DB] Unexpected pool error:", error);
    }
  });

  return drizzleNeonWs({ client: pool, casing: "snake_case", schema });
});

/**
 * @deprecated Use `getDb()` instead for Cloudflare Workers compatibility.
 * This alias exists for backward compatibility during migration.
 */
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
