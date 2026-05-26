import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["puppeteer"],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
