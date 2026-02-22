import { polarClient } from "@polar-sh/better-auth";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [twoFactorClient(), polarClient()],
});

export const { signIn, signUp, signOut, useSession, twoFactor } = authClient;
