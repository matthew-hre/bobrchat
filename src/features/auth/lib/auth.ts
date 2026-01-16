import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { createDefaultUserSettings } from "~/features/settings/actions";
import { db } from "~/lib/db";
import * as schema from "~/lib/db/schema";
import { sendEmail } from "~/lib/email";
import { serverEnv } from "~/lib/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
  baseAuthPath: "/api/auth",
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      sendEmail({
        to: user.email,
        subject: "Reset your bobrchat password",
        html: `
          <h1>Reset your password</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${url}">Reset Password</a>
          <p>If you didn't request a password reset, you can ignore this email.</p>
        `,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      sendEmail({
        to: user.email,
        subject: "Verify your email for bobrchat",
        html: `
          <h1>Welcome to bobrchat!</h1>
          <p>Click the link below to verify your email address:</p>
          <a href="${url}">Verify Email</a>
          <p>If you didn't create an account, you can ignore this email.</p>
        `,
      });
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
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
