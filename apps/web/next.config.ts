import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Reads the raw variable instead of the validated env module. Importing
  // that module here would make `next typegen` require a production-only
  // variable, and this branch only runs in development.
  // oxlint-disable-next-line require-await
  async rewrites() {
    if (process.env.VERCEL) {
      return [];
    }

    return [
      {
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/:path*`,
        source: "/api/:path*",
      },
    ];
  },

  transpilePackages: ["@vercel/geistdocs"],
};

export default nextConfig;
