import { readFileSync } from "node:fs";
import { expect, test } from "bun:test";
import { checkSize, loadBudget } from "../../scripts/v2/css/rules";
import { realTree, TICK_CSS } from "./seed";

const budget = loadBudget();

test("R11: v2 CSS source bytes stay within the +5% ratchet in css-budget.json", () => {
  expect(budget.ratchet).toBe(1.05);
  expect(checkSize(realTree, budget)).toEqual([]);
});

// T2 Tile soft (Keel pending, 2026-11-02): limits are the measured size plus a fixed headroom,
// gzip 9,042 B + 10 → 9,052 and source 64,094 B + 50 → 64,144. See TOKENS.md, "T2 Tile soft".
test("R11 T2: limits are the measured size + 10 B gzip / + 50 B source (Keel, 2026-11-02)", () => {
  const raw: unknown = JSON.parse(
    readFileSync(new URL("../../src/v2/design/css-budget.json", import.meta.url), "utf8"),
  );
  const pick = (k: string): unknown =>
    typeof raw === "object" && raw !== null && k in raw ? Reflect.get(raw, k) : undefined;
  expect([pick("builtGzipBytes"), pick("builtGzipCeiling")]).toEqual([9042, 9052]);
  expect([budget.sourceBytes, budget.sourceCeiling]).toEqual([64094, 64144]);
  expect(9052 - 9042).toBe(10);
  expect(64144 - 64094).toBe(50);
});

test("R11: a CSS file that blows the budget fails", () => {
  const tree = new Map(realTree);
  tree.set(
    TICK_CSS,
    `${tree.get(TICK_CSS) ?? ""}${"/* pad */\n".repeat(Math.ceil(budget.sourceBytes / 10))}`,
  );
  expect(checkSize(tree, budget).length).toBe(1);
});
