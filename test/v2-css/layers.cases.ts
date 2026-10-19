import { expect, test } from "bun:test";

import { checkLayers } from "../../scripts/v2/css/rules";
import { BASE, greenSeeds, realTree, type Seed, TICK_CSS } from "./seed";

test("R2: the real tree keeps every rule in its folder's layer", () => {
  expect(checkLayers(realTree)).toEqual([]);
});

test("R2: seeded violations fail", () => {
  const seeds: Seed[] = [
    {
      name: "unlayered rule after the @layer block",
      path: TICK_CSS,
      edit: (c) => `${c}\n.root { color: var(--text); }\n`,
    },
    {
      name: "wrong layer name (overrides)",
      path: TICK_CSS,
      edit: (c) => c.replace("@layer primitives", "@layer overrides"),
    },
    {
      name: "layer owned by another folder (app)",
      path: TICK_CSS,
      edit: (c) => c.replace("@layer primitives", "@layer app"),
    },
    {
      name: "layer order swapped",
      path: BASE,
      edit: (c) => c.replace("primitives, layout", "layout, primitives"),
    },
    {
      name: "second order statement",
      path: TICK_CSS,
      edit: (c) => `@layer reset, tokens, base, primitives, layout, app, overrides;\n${c}`,
    },
    {
      name: "unlayered @media",
      path: TICK_CSS,
      edit: (c) => `${c}\n@media (prefers-contrast: more) { .root { color: var(--text); } }\n`,
    },
  ];
  expect(greenSeeds(seeds, checkLayers, "R2")).toEqual([]);
});
