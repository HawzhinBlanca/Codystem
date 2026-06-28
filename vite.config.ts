import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Static dashboard app. Production build is served from GitHub Pages at /Codystem/;
// the dev server uses "/" so local preview is at the root.
export default defineConfig(({ command }) => ({
  root: "web",
  base: command === "build" ? "/Codystem/" : "/",
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist", emptyOutDir: true },
  server: { port: Number(process.env.PORT) || 5173, host: true },
}));
