import { defineConfig } from "drizzle-kit";

import { serverEnv } from "~/lib/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  casing: "snake_case",
  dbCredentials: {
    url: serverEnv.DATABASE_URL!,
  },
});
