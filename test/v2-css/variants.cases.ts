import { expect, test } from "bun:test";

import { checkVariants } from "../../scripts/v2/css/rules";
import {
  appendInLayer,
  greenSeeds,
  realTree,
  type Seed,
  SHELL_TSX,
  STACK_TSX,
  TICK_CSS,
  TICK_TSX,
} from "./seed";

test("R7: data-* variants match each component's exported `variants`; no class lists", () => {
  expect(checkVariants(realTree)).toEqual([]);
});

test("R7: seeded violations fail", () => {
  const seeds: Seed[] = [
    {
      name: "undeclared data-* value in CSS",
      path: TICK_CSS,
      edit: appendInLayer('.root[data-disabled="maybe"] { opacity: 1; }'),
    },
    {
      name: "undeclared data-* key in CSS",
      path: TICK_CSS,
      edit: appendInLayer('.root[data-size="lg"] { opacity: 1; }'),
    },
    {
      name: "declared value with no rule",
      path: TICK_TSX,
      edit: (c) => c.replace('size: ["pair"]', 'size: ["pair", "mixed"]'),
    },
    {
      name: "conditional className",
      path: TICK_TSX,
      edit: (c) => c.replace("className={root}", "className={checked ? root : body}"),
    },
    {
      name: "template className",
      path: TICK_TSX,
      edit: (c) => c.replace("className={root}", "className={`${root} ${body}`}"),
    },
    {
      name: "class list built outside JSX",
      path: STACK_TSX,
      edit: (c) => c.replace('styles["root"] ?? "stack-root"', 'pad ? styles["root"] : "x"'),
    },
    {
      name: "string className",
      path: SHELL_TSX,
      edit: (c) => c.replace("className={columnCls}", 'className="column"'),
    },
    {
      name: "literal data-* value outside variants",
      path: STACK_TSX,
      edit: (c) => c.replace("data-gap={gap}", 'data-gap="9"'),
    },
  ];
  expect(greenSeeds(seeds, checkVariants, "R7")).toEqual([]);
});
