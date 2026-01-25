/* eslint-disable node/no-process-env */
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

import { clientEnv } from "~/lib/env";

// Need to patch this upstream
const baseURL = clientEnv.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
  plugins: [twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession, twoFactor } = authClient;
