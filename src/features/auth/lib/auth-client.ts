/* eslint-disable node/no-process-env */
import { polarClient } from "@polar-sh/better-auth";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { clientEnv } from "~/lib/env-client";

const baseURL = clientEnv.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
  plugins: [twoFactorClient(), polarClient()],
});

export const { signIn, signUp, signOut, useSession, twoFactor } = authClient;
