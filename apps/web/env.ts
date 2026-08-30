import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Next.js inlines this into the client bundle at build time. A default in
// production would ship a build pointing at the developer's own machine, so
// production builds must supply it and fail loudly when they do not.
const apiUrl =
  process.env.NODE_ENV === "production"
    ? z.url()
    : z.url().default("http://localhost:3001");

export const env = createEnv({
  client: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});
