import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base relativa para funcionar tanto no GitHub Pages (subpasta) quanto embutido no Tauri.
export default defineConfig({
  plugins: [react()],
  base: "./",
  // Headers de cross-origin isolation no dev: habilitam SharedArrayBuffer caso
  // futuramente troquemos para o core multithread do ffmpeg. Inofensivo para o
  // core single-thread.
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  // ffmpeg.wasm não deve ser pré-empacotado pelo Vite.
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  build: {
    target: "es2022",
  },
});
