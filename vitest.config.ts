import { defineConfig } from "vitest/config";

// Tests only the web app's logic + components. Kept separate from vite.config.ts so the
// build root ("web") does not affect test discovery, and so vitest never picks up the CLI's
// node:test files under src/. jsdom is needed for the React component render tests; the pure
// lib tests run fine in it too.
export default defineConfig({
  test: {
    include: ["web/src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["web/src/test-setup.ts"],
  },
});
