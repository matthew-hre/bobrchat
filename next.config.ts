/* eslint-disable node/no-process-env */
import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Use process.env directly in next.config.ts to avoid triggering env validation
// during OpenNext bundling phase when env vars aren't available
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
  serverExternalPackages: ["tiktoken", "tokenlens"],
  images: {
    remotePatterns: [
      {
        hostname: r2PublicUrl.replace(/^https?:\/\//, "") || "placeholder.local",
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
            `img-src 'self' data: blob: ${r2PublicUrl} https://avatars.githubusercontent.com`,
            "font-src 'self' data:",
            "connect-src 'self' https://openrouter.ai https://*.parallel.ai https://*.sentry.io",
            "frame-ancestors 'none'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
