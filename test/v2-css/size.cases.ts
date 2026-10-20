import { readFileSync } from "node:fs";
import { expect, test } from "bun:test";
import { checkSize, loadBudget } from "../../scripts/v2/css/rules";
import { realTree, TICK_CSS } from "./seed";

const budget = loadBudget();

test("R11: v2 CSS source bytes stay within the +5% ratchet in css-budget.json", () => {
  expect(budget.ratchet).toBe(1.05);
  expect(checkSize(realTree, budget)).toEqual([]);
});

test("R11 Slice 1: Keel's 8,600 B gzip ceiling, the source limit scaled from it", () => {
  const raw: unknown = JSON.parse(
    readFileSync(new URL("../../src/v2/design/css-budget.json", import.meta.url), "utf8"),
  );
  const pick = (k: string): unknown =>
    typeof raw === "object" && raw !== null && k in raw ? Reflect.get(raw, k) : undefined;
  expect([pick("builtGzipBytes"), pick("builtGzipCeiling")]).toEqual([7917, 8600]);
  expect(budget.sourceCeiling).toBe(Math.floor((budget.sourceBytes * 8600) / 7917));
});

test("R11: a CSS file that blows the budget fails", () => {
  const tree = new Map(realTree);
  tree.set(
    TICK_CSS,
    `${tree.get(TICK_CSS) ?? ""}${"/* pad */\n".repeat(Math.ceil(budget.sourceBytes / 10))}`,
  );
  expect(checkSize(tree, budget).length).toBe(1);
});
