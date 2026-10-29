import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { buildSha, resolveBuildSha } from "./scripts/v2/build-sha";

// SharedArrayBuffer needs cross-origin isolation. Localhost is already a secure context.
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [react(), buildSha(resolveBuildSha(process.env, import.meta.dirname))],
  server: {
    headers: isolationHeaders,
  },
  preview: {
    headers: isolationHeaders,
  },
});
