/* eslint-disable node/no-process-env */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle({ client });

console.log("Running migrations...");
await migrate(db, { migrationsFolder: "./src/lib/db/migrations" });
console.log("Migrations complete!");

await client.end();
