import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { createDefaultUserSettings } from "~/features/settings/actions";
import { db } from "~/lib/db";
import { serverEnv } from "~/lib/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
  baseAuthPath: "/api/auth",
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    github: {
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
    },
  },
  session: {
    // Enable cookie caching to avoid DB lookups on every request
    // Session data is stored in a signed cookie, refreshed every 5 minutes

    // NOTE: If we ever add custom session fields (roles, permissions, etc.),
    // use disableCookieCache: true after changing those fields:
    // await auth.api.getSession({
    //   headers: await headers(),
    //   query: { disableCookieCache: true }
    // });
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes - session is cached in cookie
    },
  },
  rateLimit: {
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/*": { window: 10, max: 5 },
      "/sign-up/*": { window: 10, max: 5 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        async after(user) {
          await createDefaultUserSettings(user.id);
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [nextCookies()],
});

// i really hate that this is how the docs want me to do this
export type Session = typeof auth.$Infer.Session;
