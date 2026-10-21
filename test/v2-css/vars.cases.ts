import { expect, test } from "bun:test";

import { LENGTH_VALUE } from "../../stylelint.config.js";
import { checkVars, strayLocals } from "../../scripts/v2/css/rules";
import {
  addDecl,
  apply,
  greenSeeds,
  MOTION,
  realTree,
  type Seed,
  SEMANTIC,
  TICK_CSS,
} from "./seed";

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

/**
 * The stylelint gate and R4 agree on local variables (one predicate, isOwnLocal): the config's
 * length list takes var(--_x), and both reject a `--_*` the file doesn't declare itself. The gate
 * (bun run lint) runs the same three cases through stylelint itself (stylelint-gate.ts AGREE).
 */
test("stylelint/R4 agree: an own --_x passes both; undeclared or foreign --_* fails both", () => {
  expect(LENGTH_VALUE.test("var(--_x)") && LENGTH_VALUE.test("0 var(--_x) var(--s-1)")).toBe(true);
  const cases: [Seed, boolean][] = [
    [
      {
        name: "own",
        path: TICK_CSS,
        edit: addDecl("--_x: var(--s-2);\n    padding-block: var(--_x);"),
      },
      true,
    ],
    [{ name: "undeclared", path: TICK_CSS, edit: addDecl("padding-block: var(--_y);") }, false],
    [
      { name: "foreign", path: TICK_CSS, edit: addDecl("padding-block: var(--_chips-max);") },
      false,
    ],
  ];
  for (const [seed, ok] of cases) {
    const tree = apply(seed);
    const r4 = !checkVars(tree).some((v) => v.startsWith(`R4 ${TICK_CSS}`));
    const gate = strayLocals(tree, TICK_CSS).length === 0;
    expect([seed.name, r4, gate]).toEqual([seed.name, ok, ok]);
  }
});
