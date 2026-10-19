import { expect, test } from "bun:test";

import { checkInlineStyle } from "../../scripts/v2/css/rules";
import { greenSeeds, realTree, type Seed, SHELL_TSX, STACK_TSX } from "./seed";

const ICON_TSX = "design/primitives/Icon/Icon.tsx";

test("R10: inline styles carry only --dyn-* properties that the component's module consumes", () => {
  expect(checkInlineStyle(realTree)).toEqual([]);
});

test("R10: seeded violations fail", () => {
  const seeds: Seed[] = [
    {
      name: "inline style={{color}}",
      path: SHELL_TSX,
      edit: (c) =>
        c.replace(
          "<div className={columnCls}>",
          '<div className={columnCls} style={{ color: "red" }}>',
        ),
    },
    {
      name: "custom property not named --dyn-*",
      path: ICON_TSX,
      edit: (c) =>
        c.replace("className={root}", 'className={root} style={{ ["--icon-x" as string]: "1" }}'),
    },
    {
      name: "--dyn-* not consumed by the module",
      path: ICON_TSX,
      edit: (c) =>
        c.replace(
          "className={root}",
          'className={root} style={{ ["--dyn-unused" as string]: "1" }}',
        ),
    },
    {
      name: "spread into style",
      path: STACK_TSX,
      edit: (c) => c.replace("data-gap={gap}", "data-gap={gap} style={{ ...{} }}"),
    },
    {
      name: "style from a call",
      path: SHELL_TSX,
      edit: (c) =>
        c.replace(
          "<div className={columnCls}>",
          "<div className={columnCls} style={Object.create(null)}>",
        ),
    },
  ];
  expect(greenSeeds(seeds, checkInlineStyle, "R10")).toEqual([]);
});
