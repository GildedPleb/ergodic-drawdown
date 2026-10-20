/**
 * R11: measure v2 CSS. Source bytes (gated in the 1 s suite at +5%) and the built gzip of the emitted CSS
 * (re-measured per PR). `--write` re-baselines css-budget.json; do that once, on purpose.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import { build, type Rollup } from "vite";

import { cssSourceBytes } from "./css/rules";
import { loadTree, REPO, V2 } from "./css/tree";

const sourceBytes = cssSourceBytes(loadTree());
const result = await build({ root: REPO, logLevel: "silent", build: { write: false } });
const outputs: Rollup.RollupOutput[] = Array.isArray(result)
  ? result
  : "output" in result
    ? [result]
    : [];
let builtGzipBytes = 0;
for (const out of outputs) {
  for (const item of out.output) {
    if (item.type === "asset" && item.fileName.endsWith(".css"))
      builtGzipBytes += gzipSync(item.source).byteLength;
  }
}
const path = join(V2, "design/css-budget.json");
const current = { sourceBytes, builtGzipBytes };
if (process.argv.includes("--write")) {
  const record = { ...current, ratchet: 1.05, measuredAt: new Date().toISOString().slice(0, 10) };
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`wrote ${path}`);
} else {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  const base =
    typeof raw === "object" && raw !== null && "builtGzipBytes" in raw ? raw.builtGzipBytes : 0;
  // Slice 1: Keel's ceiling (8,600 B) replaces the +5% ratchet until the Slice 1 close ratchets down.
  const ceiling =
    typeof raw === "object" && raw !== null && "builtGzipCeiling" in raw
      ? raw.builtGzipCeiling
      : undefined;
  const ratcheted = typeof base === "number" ? Math.floor(base * 1.05) : 0;
  const limit = typeof ceiling === "number" ? ceiling : ratcheted;
  console.log(JSON.stringify({ current, builtGzipLimit: limit }));
  if (builtGzipBytes > limit) process.exit(1);
}
