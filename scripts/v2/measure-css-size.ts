import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../../src/v2");
const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".css")) out.push(p);
  }
  return out;
};
let total = 0;
const files: Record<string, number> = {};
for (const f of walk(root)) {
  const n = readFileSync(f).byteLength;
  files[f.slice(root.length + 1)] = n;
  total += n;
}
const out = { totalBytes: total, files, measuredAt: new Date().toISOString() };
writeFileSync(
  join(import.meta.dir, "../../src/v2/design/css-size.json"),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(`v2 CSS source total: ${total} bytes`);
