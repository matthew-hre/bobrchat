/* eslint-disable node/no-process-env */
import type { NextConfig } from "next";

import { withSentryConfig } from "@sentry/nextjs";

import { serverEnv } from "./src/lib/env";

const isDev = process.env.NODE_ENV === "development";
const r2PublicUrl = process.env.R2_PUBLIC_URL || "";

// Initialize OpenNext Cloudflare bindings for local development
// Only run in dev mode to avoid starting workerd during production builds
if (isDev) {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    remotePatterns: [
      {
        hostname: serverEnv.R2_PUBLIC_URL?.replace(/^https?:\/\//, "") || "",
      },
    ],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            `img-src 'self' data: blob: ${serverEnv.R2_PUBLIC_URL || ""} https://avatars.githubusercontent.com`,
            "font-src 'self' data:",
            "connect-src 'self' https://openrouter.ai https://*.parallel.ai",
            "frame-ancestors 'none'",
          ].join("; "),
        },
      ],
    },
  ],
};

// Skip Sentry in dev to avoid ~600ms proxy.ts overhead per request
export default isDev ? nextConfig : withSentryConfig(nextConfig);
export default nextConfig;
