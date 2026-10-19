/** `bun run css:enforce`: every ADR-002 rule (stylelint core + scripts) over src/v2. */
import { loadAllowlist, loadBudget, runScriptRules } from "./rules";
import { runStylelint } from "./stylelint";
import { loadTree } from "./tree";

const tree = loadTree();
const violations = [
  ...runScriptRules(tree, loadBudget(), loadAllowlist()),
  ...(await runStylelint(tree)),
];
if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("css:enforce ok (R1–R11 + G4)");
