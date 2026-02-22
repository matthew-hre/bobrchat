/* eslint-disable node/no-process-env */
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";

import { createDefaultUserSettings } from "~/features/settings/actions";
import { createUserSubscription, syncSubscriptionFromPolarState } from "~/features/subscriptions/queries";
import { db } from "~/lib/db";
import * as schema from "~/lib/db/schema";
import { sendEmail } from "~/lib/email";
import { serverEnv } from "~/lib/env";

const isPreview = process.env.VERCEL_ENV === "preview";

function getBaseURL(): string {
  if (serverEnv.BETTER_AUTH_URL)
    return serverEnv.BETTER_AUTH_URL;
  if (process.env.VERCEL_BRANCH_URL)
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const baseURL = getBaseURL();

const usePolarSandbox = serverEnv.POLAR_SANDBOX || isPreview;

const polarClient = serverEnv.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: serverEnv.POLAR_ACCESS_TOKEN,
      server: usePolarSandbox ? "sandbox" : "production",
    })
  : null;

const polarEnabled = !!(polarClient && serverEnv.POLAR_WEBHOOK_SECRET && serverEnv.POLAR_SUCCESS_URL);

const githubEnabled = !!(serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL,
  baseAuthPath: "/api/auth",
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV !== "development" && !isPreview,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your BobrChat password",
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
    sendOnSignUp: process.env.NODE_ENV !== "development" && !isPreview,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string; createdAt: Date }; url: string }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email for BobrChat",
        html: `
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
    changeEmail: {
      enabled: true,
    },
  },
  socialProviders: githubEnabled
    ? {
        github: {
          clientId: serverEnv.GITHUB_CLIENT_ID!,
          clientSecret: serverEnv.GITHUB_CLIENT_SECRET!,
        },
      }
    : {},
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
    storage: process.env.NODE_ENV === "development" ? "memory" : "database",
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
          await Promise.all([
            createDefaultUserSettings(user.id),
            createUserSubscription(user.id),
          ]);
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    nextCookies(),
    twoFactor({
      issuer: "BobrChat",
    }),
    ...(polarEnabled && polarClient
      ? [
          polar({
            client: polarClient,
            createCustomerOnSignUp: false,
            use: [
              checkout({
                successUrl: serverEnv.POLAR_SUCCESS_URL!,
              }),
              portal(),
              webhooks({
                secret: serverEnv.POLAR_WEBHOOK_SECRET!,
                onCustomerStateChanged: async (payload) => {
                  const state = payload.data;

                  await syncSubscriptionFromPolarState({
                    userId: state.externalId ?? undefined,
                    polarCustomerId: state.id,
                    activeSubscriptions: state.activeSubscriptions.map(sub => ({
                      id: sub.id,
                      productId: sub.productId,
                    })),
                    isDeleted: state.deletedAt !== null,
                  });
                },
              }),
            ],
          }),
        ]
      : []),
  ],
});

// i really hate that this is how the docs want me to do this
export type Session = typeof auth.$Infer.Session;
