import type { NextConfig } from "next";

import { serverEnv } from "./src/config/env";

// Fail fast: dev, build and start all refuse to run with missing or invalid env vars.
serverEnv();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Camera and microphone stay available to our own origin for calls (Module 11).
    value: "camera=(self), microphone=(self), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Django URLs end in "/"; keep them as-is so the /api/backend proxy never redirects.
  skipTrailingSlashRedirect: true,
  typedRoutes: true,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/cloudinary-loader.ts",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
