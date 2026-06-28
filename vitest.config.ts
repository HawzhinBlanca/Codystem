import { defineConfig } from "vitest/config";

// Tests only the web app's pure logic. Kept separate from vite.config.ts so the build
// root ("web") does not affect test discovery, and so vitest never picks up the CLI's
// node:test files under src/.
export default defineConfig({
  test: {
    include: ["web/src/**/*.test.ts"],
    environment: "node",
  },
});
