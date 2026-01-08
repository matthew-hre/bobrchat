import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "~/lib/env";

import * as schema from "./schema";

function createDb() {
  if (serverEnv.NODE_ENV === "development") {
    // For postgres-js, pass the client instance directly
    const client = postgres(serverEnv.DATABASE_URL);
    return drizzlePostgres({ client, casing: "snake_case", schema });
  }

  // For neon-http, pass the neon client
  const client = neon(serverEnv.DATABASE_URL);
  return drizzleNeon({ client, casing: "snake_case", schema });
}

export const db = createDb();
