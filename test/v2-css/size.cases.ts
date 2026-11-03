import { readFileSync } from "node:fs";
import { expect, test } from "bun:test";
import { checkSize, loadBudget } from "../../scripts/v2/css/rules";
import { realTree, TICK_CSS } from "./seed";

const budget = loadBudget();

test("R11: v2 CSS source bytes stay within the +5% ratchet in css-budget.json", () => {
  expect(budget.ratchet).toBe(1.05);
  expect(checkSize(realTree, budget)).toEqual([]);
});

// U1/T2 r45 (Keel, 2026-11-03, interim): measured on d2a7df6 + r45 at 64,057 / 9,062, so
// gzip 9,062 B + 10 → 9,072 and source 64,057 B + 50 → 64,107. See TOKENS.md, "U1/T2 r45".
test("R11 r45: limits are the measured size + 10 B gzip / + 50 B source (Keel, 2026-11-03)", () => {
  const raw: unknown = JSON.parse(
    readFileSync(new URL("../../src/v2/design/css-budget.json", import.meta.url), "utf8"),
  );
  const pick = (k: string): unknown =>
    typeof raw === "object" && raw !== null && k in raw ? Reflect.get(raw, k) : undefined;
  expect([pick("builtGzipBytes"), pick("builtGzipCeiling")]).toEqual([9062, 9072]);
  expect([budget.sourceBytes, budget.sourceCeiling]).toEqual([64057, 64107]);
  expect(9072 - 9062).toBe(10);
  expect(64107 - 64057).toBe(50);
});

test("R11: a CSS file that blows the budget fails", () => {
  const tree = new Map(realTree);
  tree.set(
    TICK_CSS,
    `${tree.get(TICK_CSS) ?? ""}${"/* pad */\n".repeat(Math.ceil(budget.sourceBytes / 10))}`,
  );
  expect(checkSize(tree, budget).length).toBe(1);
});
