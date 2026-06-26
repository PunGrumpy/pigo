import type { NextConfig } from "next";

import { env } from "./env";

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  images: {
    formats: ["image/avif", "image/webp"],
  },

  // oxlint-disable-next-line require-await
  async rewrites() {
    if (process.env.VERCEL) {
      return [];
    }

    return [
      {
        destination: `${env.NEXT_PUBLIC_API_URL}/:path*`,
        source: "/api/:path*",
      },
    ];
  },
};

export default nextConfig;
