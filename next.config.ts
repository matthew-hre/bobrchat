/* eslint-disable node/no-process-env */
import type { NextConfig } from "next";

const r2PublicUrl = process.env.R2_PUBLIC_URL || "";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    remotePatterns: [
      {
        hostname: r2PublicUrl.replace(/^https?:\/\//, "") || "",
      },
    ],
  },
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@polar-sh/better-auth",
    "@polar-sh/sdk",
    "drizzle-orm",
    "postgres",
    "pdf-lib",
    "file-type",
    "resend",
  ],
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
            `connect-src 'self' https://openrouter.ai https://*.parallel.ai ${serverEnv.R2_PUBLIC_URL || ""}`,
            `frame-src 'self' blob: ${serverEnv.R2_PUBLIC_URL || ""}`,
            "frame-ancestors 'none'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
