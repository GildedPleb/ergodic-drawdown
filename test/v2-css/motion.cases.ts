import { expect, test } from "bun:test";

import { checkMotion } from "../../scripts/v2/css/rules";
import { appendInLayer, greenSeeds, realTree, type Seed, TICK_CSS } from "./seed";

const GUARDED =
  "@media (prefers-reduced-motion: no-preference) { .check { transition: opacity var(--dur-fast) var(--ease-out); } }";

test("R9: the real tree animates only inside the no-preference guard", () => {
  expect(checkMotion(realTree)).toEqual([]);
});

test("R9: a compliant guarded animation passes (no false positive)", () => {
  const tree = new Map(realTree);
  tree.set(
    TICK_CSS,
    appendInLayer(
      `${GUARDED}\n  @keyframes tick-in { from { opacity: 0; } to { opacity: 1; transform: scaleY(1); } }`,
    )(tree.get(TICK_CSS) ?? ""),
  );
  expect(checkMotion(tree)).toEqual([]);
});

test("R9: seeded violations fail", () => {
  const seeds: Seed[] = [
    {
      name: "transition outside the guard",
      path: TICK_CSS,
      edit: appendInLayer(".check { transition: opacity var(--dur-fast); }"),
    },
    {
      name: "animation outside the guard",
      path: TICK_CSS,
      edit: appendInLayer(".check { animation: tick-in var(--dur-fast); }"),
    },
    {
      name: "guard on reduce instead of no-preference",
      path: TICK_CSS,
      edit: appendInLayer(GUARDED.replace("no-preference", "reduce")),
    },
    {
      name: "@keyframes animating width",
      path: TICK_CSS,
      edit: appendInLayer("@keyframes grow { to { inline-size: 100%; } }"),
    },
  ];
  expect(greenSeeds(seeds, checkMotion, "R9")).toEqual([]);
});
