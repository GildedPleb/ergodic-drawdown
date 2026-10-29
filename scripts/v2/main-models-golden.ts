/**
 * Write test/v2/main-models.golden.json (G12 (a)): main's models, walks and ModelProvider defaults,
 * dumped generically by test/v2/support/main-models.ts. Spawns bun to load src/ (keeps this file
 * inside tsconfig.node without pulling src).
 *
 * Run this ONLY in the merge commit that brings main into redesign. Any other run would just copy
 * main's drift into the golden and silence the G12 check. When main's models change, the golden
 * test goes red; the merge commit regenerates the golden and the settings tests then name every
 * control the Models pane must add or change.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");
const outPath = join(root, "test/v2/main-models.golden.json");

if (import.meta.main) {
  const run = spawnSync(
    process.execPath,
    [
      "-e",
      `import { dumpMainModels } from ${JSON.stringify(`${root}/test/v2/support/main-models.ts`)};
       process.stdout.write(JSON.stringify(dumpMainModels(), null, 2) + "\\n");`,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0) {
    console.error(run.stderr || run.stdout);
    process.exit(run.status ?? 1);
  }
  writeFileSync(outPath, run.stdout);
  // The repo's formatter owns the layout, so a fresh golden passes `bun run format`.
  spawnSync(join(root, "node_modules/.bin/oxfmt"), [outPath], { stdio: "inherit" });
  console.log(`wrote ${outPath}`);
}
