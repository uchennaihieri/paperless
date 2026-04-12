import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer"],
  allowedDevOrigins: ['10.98.149.223']
};

export default nextConfig;
