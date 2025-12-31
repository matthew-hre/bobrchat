import type { NextConfig } from "next";

import "src/lib/env";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tiktoken", "tokenlens"],
};

export default nextConfig;
