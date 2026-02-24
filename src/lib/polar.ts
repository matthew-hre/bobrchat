import { Polar } from "@polar-sh/sdk";

import { serverEnv } from "~/lib/env";

export const polarClient = serverEnv.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: serverEnv.POLAR_ACCESS_TOKEN,
      server: serverEnv.POLAR_SANDBOX ? "sandbox" : "production",
    })
  : null;
