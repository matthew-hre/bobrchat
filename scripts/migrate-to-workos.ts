/**
 * Migration script: better-auth → WorkOS
 *
 * Run BEFORE applying the Drizzle migration that drops the `accounts` table.
 *
 * Usage:
 *   bun run scripts/migrate-to-workos.ts
 *
 * Required env vars: DATABASE_URL, WORKOS_API_KEY
 *
 * What it does:
 *   1. Adds `workos_id` column to `users` if it doesn't exist yet
 *   2. Reads all users + credential password hashes from the old `accounts` table
 *   3. Creates each user in WorkOS (with password hash in PHC format if applicable)
 *   4. Writes the returned WorkOS user ID back to `users.workos_id`
 *
 * Safe to re-run: skips users that already have a `workos_id`.
 */

import postgres from "postgres";
import { WorkOS } from "@workos-inc/node";

/* eslint-disable node/no-process-env */
const DATABASE_URL = process.env.DATABASE_URL;
const WORKOS_API_KEY = process.env.WORKOS_API_KEY;

if (!DATABASE_URL || !WORKOS_API_KEY) {
  console.error("Missing required env vars: DATABASE_URL, WORKOS_API_KEY");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);
const workos = new WorkOS(WORKOS_API_KEY);

// ---------------------------------------------------------------------------
// Password hash conversion
// ---------------------------------------------------------------------------

/**
 * Convert a better-auth scrypt hash to PHC string format for WorkOS.
 *
 * better-auth stores: `<32-char hex salt>:<128-char hex hash>`
 *
 * better-auth uses @noble/hashes/scrypt which UTF-8-encodes string inputs.
 * The hex salt string is passed directly, so the *actual* salt bytes used in
 * the scrypt computation are the UTF-8 encoding of the hex string (32 bytes),
 * NOT the hex-decoded binary (16 bytes).
 *
 * Scrypt params (better-auth defaults): N=16384, r=16, p=1, dkLen=64
 */
function betterAuthHashToPhc(storedHash: string): string {
  const [hexSalt, hexKey] = storedHash.split(":");
  if (!hexSalt || !hexKey) {
    throw new Error(`Invalid better-auth hash format: ${storedHash}`);
  }

  // Salt: the UTF-8 bytes of the hex string (what @noble/hashes actually used)
  const saltB64 = Buffer.from(hexSalt, "utf-8")
    .toString("base64")
    .replace(/=+$/, "");

  // Hash: the raw 64 bytes (hex-decoded)
  const keyB64 = Buffer.from(hexKey, "hex")
    .toString("base64")
    .replace(/=+$/, "");

  return `$scrypt$v=1$n=16384,r=16,p=1,kl=64$${saltB64}$${keyB64}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // 1. Ensure workos_id column exists (idempotent)
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS workos_id text UNIQUE
  `;
  console.log("✓ Ensured workos_id column exists");

  // 2. Fetch all users without a workos_id
  const users = await sql`
    SELECT id, name, email, email_verified, image
    FROM users
    WHERE workos_id IS NULL
  `;
  console.log(`Found ${users.length} users to migrate`);

  if (users.length === 0) {
    console.log("Nothing to do.");
    await sql.end();
    return;
  }

  // 3. Fetch credential password hashes from accounts table
  const credentialAccounts = await sql`
    SELECT user_id, password
    FROM accounts
    WHERE provider_id = 'credential' AND password IS NOT NULL
  `;

  const passwordMap = new Map<string, string>();
  for (const account of credentialAccounts) {
    passwordMap.set(account.user_id, account.password);
  }
  console.log(`Found ${passwordMap.size} credential (password) accounts`);

  // 4. Migrate each user
  let migrated = 0;
  let failed = 0;

  for (const user of users) {
    const [firstName, ...lastNameParts] = (user.name as string).split(" ");
    const lastName = lastNameParts.join(" ") || undefined;

    const createParams: Parameters<typeof workos.userManagement.createUser>[0] =
      {
        email: user.email,
        emailVerified: user.email_verified,
        firstName,
        lastName,
      };

    // Attach password hash for credential accounts
    const rawHash = passwordMap.get(user.id);
    if (rawHash) {
      createParams.passwordHash = betterAuthHashToPhc(rawHash);
      createParams.passwordHashType = "scrypt";
    }

    try {
      const workosUser = await workos.userManagement.createUser(createParams);

      await sql`
        UPDATE users SET workos_id = ${workosUser.id} WHERE id = ${user.id}
      `;

      const method = rawHash ? "password" : "oauth-only";
      console.log(
        `  ✓ ${user.email} → ${workosUser.id} (${method})`,
      );
      migrated++;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      console.error(`  ✗ ${user.email}: ${message}`);
      failed++;
    }
  }

  console.log(
    `\nDone. Migrated: ${migrated}, Failed: ${failed}, Total: ${users.length}`,
  );
  await sql.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
