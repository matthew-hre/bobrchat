/* eslint-disable node/no-process-env */
import { Polar } from "@polar-sh/sdk";

let _polarClient: Polar | null | undefined;

export function getPolarClient(): Polar | null {
  if (_polarClient === undefined) {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    _polarClient = accessToken
      ? new Polar({
          accessToken,
          server: process.env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
        })
      : null;
  }
  return _polarClient;
}
