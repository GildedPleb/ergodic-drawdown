import { expect, test } from "bun:test";

import { checkVars } from "../../scripts/v2/css/rules";
import { addDecl, greenSeeds, MOTION, realTree, type Seed, SEMANTIC, TICK_CSS } from "./seed";

test("R4: every var() resolves to a token, an owned --dyn-*, or a local --_*; durations ≤ 400ms", () => {
  expect(checkVars(realTree)).toEqual([]);
});

test("R4: seeded violations fail", () => {
  const seeds: Seed[] = [
    { name: "undefined var", path: TICK_CSS, edit: addDecl("color: var(--not-a-token);") },
    { name: "var() fallback", path: TICK_CSS, edit: addDecl("padding-block: var(--s-1, 4px);") },
    {
      name: "--dyn-* the component never sets",
      path: TICK_CSS,
      edit: addDecl("inline-size: var(--dyn-ghost);"),
    },
    {
      name: "duration token at 900ms",
      path: MOTION,
      edit: (c) => c.replace("--dur-fast: 180ms", "--dur-fast: 900ms"),
    },
    {
      name: "deleted-but-used token",
      path: SEMANTIC,
      edit: (c) => c.replace(/--selected:[^;]+;/g, ""),
    },
  ];
  expect(greenSeeds(seeds, checkVars, "R4")).toEqual([]);
});
