import { expect, test } from "bun:test";

import { checkModules } from "../../scripts/v2/css/rules";
import {
  appendInLayer,
  greenSeeds,
  realTree,
  type Seed,
  SHELL_TSX,
  TICK_CSS,
  TICK_TSX,
} from "./seed";

test("R1: one module per component, every class used and every styles.x defined", () => {
  expect(checkModules(realTree)).toEqual([]);
});

test("R1: seeded violations fail", () => {
  const seeds: Seed[] = [
    { name: "unused class", path: TICK_CSS, edit: appendInLayer(".ghost { opacity: 0; }") },
    {
      name: "styles.x missing from the module",
      path: TICK_TSX,
      edit: (c) => c.replace('styles["mark"]', 'styles["nope"]'),
    },
    {
      name: "foreign importer",
      path: SHELL_TSX,
      edit: (c) =>
        `import foreign from "../../design/primitives/TickToggle/TickToggle.module.css";\nvoid foreign;\n${c}`,
    },
    {
      name: "computed styles[expr]",
      path: TICK_TSX,
      edit: (c) => c.replace('styles["mark"]', "styles[label]"),
    },
  ];
  expect(greenSeeds(seeds, checkModules, "R1")).toEqual([]);
});
