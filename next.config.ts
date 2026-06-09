import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["puppeteer"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
