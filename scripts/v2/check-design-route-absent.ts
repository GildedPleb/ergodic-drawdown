/** Build without VITE_DESIGN_ROUTE; assert DesignRoute sentinel absent from dist. */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");
const dist = join(root, "dist");
const env = { ...process.env };
delete env["VITE_DESIGN_ROUTE"];

const build = spawnSync("bun", ["run", "build"], { env, stdio: "inherit", cwd: root });
if (build.status !== 0) process.exit(build.status ?? 1);

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
};

const needles = ["DesignRoute", "tick-toggle-linen", "No story:"];
const hits: string[] = [];
for (const file of walk(dist)) {
  if (!/\.(js|css|html)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const n of needles) {
    if (text.includes(n)) hits.push(`${file}: ${n}`);
  }
}
if (hits.length > 0) {
  console.error("Design route leaked:\n" + hits.join("\n"));
  process.exit(1);
}
console.log("OK: design route absent from production bundle");
