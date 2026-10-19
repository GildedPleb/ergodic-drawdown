/**
 * Write test/v2/old-ui-models.snapshot.json from the old UI sources (G12).
 * Spawns bun to load src/ (keeps this file inside tsconfig.node without pulling src).
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");
const outPath = join(root, "test/v2/old-ui-models.snapshot.json");

const isSnapSummary = (
  value: unknown,
): value is {
  modelOrder: string[];
  walks: string[];
  defaultModel: string;
  defaultWalk: string;
} => {
  if (typeof value !== "object" || value === null) return false;
  if (!("modelOrder" in value) || !("walks" in value)) return false;
  if (!("defaultModel" in value) || !("defaultWalk" in value)) return false;
  return (
    Array.isArray(value.modelOrder) &&
    Array.isArray(value.walks) &&
    typeof value.defaultModel === "string" &&
    typeof value.defaultWalk === "string"
  );
};

if (import.meta.main) {
  const run = spawnSync(
    process.execPath,
    [
      "-e",
      `import { buildOldUiModelsSnapshot } from ${JSON.stringify(`${root}/src/v2/app/models/from-old-ui.ts`)};
       const snap = buildOldUiModelsSnapshot();
       process.stdout.write(JSON.stringify(snap, null, 2) + "\\n");`,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0) {
    console.error(run.stderr || run.stdout);
    process.exit(run.status ?? 1);
  }
  writeFileSync(outPath, run.stdout);
  const parsed: unknown = JSON.parse(run.stdout);
  if (!isSnapSummary(parsed)) {
    console.error("snapshot JSON missing expected fields");
    process.exit(1);
  }
  console.log(`wrote ${outPath}`);
  console.log(`models(${parsed.modelOrder.length}): ${parsed.modelOrder.join(" | ")}`);
  console.log(`walks(${parsed.walks.length}): ${parsed.walks.join(" | ")}`);
  console.log(`defaultModel=${parsed.defaultModel} defaultWalk=${parsed.defaultWalk}`);
}
