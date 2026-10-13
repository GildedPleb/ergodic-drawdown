import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import svgrPlugin from "vite-plugin-svgr";
import fs from "fs";
var options = {
    remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
};
// Development-only HTTPS options
var httpsOptions = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem"),
};
// SharedArrayBuffer is enabled only when the document is cross-origin isolated.
// Localhost is already a secure context, so preview can stay on http.
var isolationHeaders = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
};
// Conditional configuration based on environment
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var isDev = mode === "development";
    return {
        plugins: [react(), mdx(options), svgrPlugin()],
        // Remove the base as Netlify will handle this
        base: isDev ? "/ergodic-drawdown/" : "/",
        server: isDev
            ? {
                https: httpsOptions,
                headers: isolationHeaders,
            }
            : undefined,
        preview: {
            headers: isolationHeaders,
        },
    };
});
