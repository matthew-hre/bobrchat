/* eslint-disable node/no-process-env */
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeonWs } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

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

function createDb() {
  if (process.env.NODE_ENV === "development") {
    const client = postgres(serverEnv.DATABASE_URL, {
      max: 20,
      idle_timeout: 30, // Reduced from 60 to avoid Neon timeout (which is 5 min)
      connect_timeout: 10,
    });
    return drizzlePostgres({ client, casing: "snake_case", schema });
  }

  // Use Pool (WebSocket) instead of neon (HTTP) for transaction support.
  const pool = new Pool({
    connectionString: serverEnv.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000, // Reduced from 60000 to 30s - Neon's auto-suspend is 5 min on free plan
    connectionTimeoutMillis: 10000,
  });

  // Gracefully handle Neon compute restarts and connection errors
  // Don't crash on connection errors - let retry logic in app layer handle it
  pool.on("error", (error: Error) => {
    if (isTransientError(error)) {
      console.warn("[DB] Transient connection error (will retry):", error.message);
    }
    else {
      console.error("[DB] Unexpected pool error:", error);
    }
  });

  return drizzleNeonWs({ client: pool, casing: "snake_case", schema });
}

export const db = createDb();
