/** Run the repo's core stylelint config over a tree (real or seeded) through the Node API. */
import { join } from "node:path";

import stylelint from "stylelint";

import config from "../../../stylelint.config.js";
import { cssFiles, REPO, type Tree } from "./tree";

export const runStylelint = async (tree: Tree, only?: readonly string[]): Promise<string[]> => {
  const out: string[] = [];
  for (const path of only ?? cssFiles(tree)) {
    const result = await stylelint.lint({
      code: tree.get(path) ?? "",
      codeFilename: join(REPO, "src/v2", path),
      config,
      configBasedir: REPO,
    });
    for (const r of result.results) {
      for (const w of r.warnings) out.push(`stylelint ${path}:${w.line} ${w.rule}: ${w.text}`);
    }
  }
  return out;
};
