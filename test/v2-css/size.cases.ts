import { readFileSync } from "node:fs";
import { expect, test } from "bun:test";
import { checkSize, loadBudget } from "../../scripts/v2/css/rules";
import { realTree, TICK_CSS } from "./seed";

const budget = loadBudget();

test("R11: v2 CSS source bytes stay within the +5% ratchet in css-budget.json", () => {
  expect(budget.ratchet).toBe(1.05);
  expect(checkSize(realTree, budget)).toEqual([]);
});

// Slice 1 final (Keel): after the dead-style audit both limits are the measured size + 2%
// (7,749 B gzip → 7,903; 54,041 B source → 55,121). See TOKENS.md, "Dead-style audit".
// U1's scoped gzip raise to 8,020 is reverted with the chip (TOKENS.md, "U1 Undo chip").
test("R11 Slice 1: limits are the post-audit measured size + 2% (Keel, final for Slice 1)", () => {
  const raw: unknown = JSON.parse(
    readFileSync(new URL("../../src/v2/design/css-budget.json", import.meta.url), "utf8"),
  );
  const pick = (k: string): unknown =>
    typeof raw === "object" && raw !== null && k in raw ? Reflect.get(raw, k) : undefined;
  expect([pick("builtGzipBytes"), pick("builtGzipCeiling")]).toEqual([7749, 7903]);
  expect([budget.sourceBytes, budget.sourceCeiling]).toEqual([54041, 55121]);
  expect(Math.floor(7749 * 1.02)).toBe(7903);
  expect(Math.floor(54041 * 1.02)).toBe(55121);
});

test("R11: a CSS file that blows the budget fails", () => {
  const tree = new Map(realTree);
  tree.set(
    TICK_CSS,
    `${tree.get(TICK_CSS) ?? ""}${"/* pad */\n".repeat(Math.ceil(budget.sourceBytes / 10))}`,
  );
  expect(checkSize(tree, budget).length).toBe(1);
});
