import { expect, test } from "bun:test";

import { checkTiers } from "../../scripts/v2/css/rules";
import { addDecl, greenSeeds, MOTION, realTree, type Seed, SEMANTIC, TICK_CSS } from "./seed";

test("R5: raw colours only in palette.css; components use semantic names; walk tokens only in LabelGlyphs", () => {
  expect(checkTiers(realTree)).toEqual([]);
});

test("R5: seeded violations fail", () => {
  const seeds: Seed[] = [
    {
      name: "raw hex in semantic.css",
      path: SEMANTIC,
      edit: (c) => c.replace("--ground: var(--ink-950);", "--ground: #14120e;"),
    },
    {
      name: "colour literal in --shadow-sheet (no exceptions outside palette)",
      path: MOTION,
      edit: (c) => c.replace("var(--shadow-ink)", "rgb(0 0 0 / 0.35)"),
    },
    {
      name: "--shadow-sheet skipping the semantic --shadow-ink",
      path: MOTION,
      edit: (c) => c.replace("var(--shadow-ink)", "var(--shadow-ink-dark)"),
    },
    {
      name: "raw length in semantic.css",
      path: SEMANTIC,
      edit: (c) =>
        c.replace("--ground: var(--ink-950);", "--ground: var(--ink-950);\n    --gap: 4px;"),
    },
    {
      name: "raw hex inside calc() in a module",
      path: TICK_CSS,
      edit: addDecl("color: calc(#fff);"),
    },
    { name: "palette var in a module", path: TICK_CSS, edit: addDecl("color: var(--gold-225);") },
    {
      name: "--walk-up outside LabelGlyphs",
      path: TICK_CSS,
      edit: addDecl("color: var(--walk-up);"),
    },
  ];
  expect(greenSeeds(seeds, checkTiers, "R5")).toEqual([]);
});

test("R5: hex inside a comment is ignored", () => {
  const tree = new Map(realTree);
  tree.set(TICK_CSS, `/* was #393122 */\n${tree.get(TICK_CSS) ?? ""}`);
  expect(checkTiers(tree)).toEqual([]);
});
