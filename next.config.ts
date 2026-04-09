import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // Your project has ESLint errors.
    // Fix
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
