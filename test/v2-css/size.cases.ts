import { expect, test } from "bun:test";
import { checkSize, loadBudget } from "../../scripts/v2/css/rules";
import { realTree, TICK_CSS } from "./seed";

const budget = loadBudget();

test("R11: v2 CSS source bytes stay within the +5% ratchet in css-budget.json", () => {
  expect(budget.ratchet).toBe(1.05);
  expect(checkSize(realTree, budget)).toEqual([]);
});

test("R11: a CSS file that blows the budget fails", () => {
  const tree = new Map(realTree);
  tree.set(
    TICK_CSS,
    `${tree.get(TICK_CSS) ?? ""}${"/* pad */\n".repeat(Math.ceil(budget.sourceBytes / 10))}`,
  );
  expect(checkSize(tree, budget).length).toBe(1);
});
