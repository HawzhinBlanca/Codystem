import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

const entry = (p: string) => fileURLToPath(new URL(`web/${p}`, import.meta.url));

// Multi-page static site, served from GitHub Pages at /Codystem/ (dev uses "/").
//   index.html  -> the Budget tracker product
//   status.html -> the CODYSTEM project dashboard
export default defineConfig(({ command }) => ({
  root: "web",
  base: command === "build" ? "/Codystem/" : "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: { input: { main: entry("index.html"), status: entry("status.html") } },
  },
  server: { port: Number(process.env.PORT) || 5173, host: true },
}));
