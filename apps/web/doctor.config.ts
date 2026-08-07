import { defineConfig } from "react-doctor/api";

export default defineConfig({
  ignore: {
    overrides: [
      {
        // Object URLs created here are lifecycle-managed across files:
        // runJob revokes the prior result URL on replace and stale runs,
        // and revokeJobUrls (lib/image/revoke.ts) revokes original and
        // result URLs on job removal, clear-all, and unmount.
        files: [
          "lib/compress/api.ts",
          "lib/compress/browser.ts",
          "lib/image/ingest.ts",
        ],
        rules: ["react-doctor/no-create-object-url-without-revoke"],
      },
      {
        // Deliberate one-shot client-side health probe: it measures
        // whether the API is reachable from the user's browser, so it
        // cannot move to the server or an event handler.
        files: ["components/status.tsx"],
        rules: ["react-doctor/no-fetch-in-effect"],
      },
    ],
  },
});
