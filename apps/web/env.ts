// Next.js inlines this into the client bundle at build time. A fallback in
// production would ship a build pointing at the developer's own machine, so
// `next build` fails here when the variable is missing or invalid. `tsc` and
// `next typegen` never evaluate this module.
if (
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  !URL.canParse(process.env.NEXT_PUBLIC_API_URL ?? "")
) {
  throw new Error(
    "NEXT_PUBLIC_API_URL must be set to a valid URL for production builds"
  );
}

export const env = {
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
};
