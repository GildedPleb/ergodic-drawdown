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
var httpsOptions = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem"),
};
export default defineConfig({
    plugins: [react(), mdx(options), svgrPlugin()],
    base: "/ergodic-drawdown/",
    server: {
        https: httpsOptions,
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
        },
    },
});
