import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during build to allow deployment
    // ESLint can still be run manually during development
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
