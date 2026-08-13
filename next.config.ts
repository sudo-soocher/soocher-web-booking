import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a verification build write somewhere other than `.next`, so running
  // `next build` never overwrites the chunks a running `next dev` is serving
  // (which shows up as "Cannot find module './NNNN.js'" and 404s on static
  // chunks). Use `npm run build:check` while a dev server is up.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Doctor and patient avatars live in Firebase Storage. Without these
    // patterns next/image refuses the URLs, which is why they were being
    // rendered as plain <img> tags — full-size originals, no WebP/AVIF, no
    // lazy loading, and no intrinsic size (so every card shifted on load).
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    // Avatars are small and fixed-size; these are the widths actually requested.
    imageSizes: [32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
