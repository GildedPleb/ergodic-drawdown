import { expect, test } from "bun:test";

import { MS_PER_WEEK } from "../src/constants";
import { handleDrawdownStatic } from "../src/contexts/computed/drawdown-static";
import { handleInflationFactors } from "../src/contexts/computed/inflation-factors";
import { handleMaxArray } from "../src/contexts/computed/max-array";
import { handleMaxModel } from "../src/contexts/computed/max-dataset";
import { handleMinArray } from "../src/contexts/computed/min-array";
import { handleMinModel } from "../src/contexts/computed/min-dataset";
import { type BoundSlot, type CashflowSlot } from "../src/engine/memory";
import { allocatedEpochs, chartWeeksCovered } from "../src/horizon";
import { numberAt } from "../src/number-at";
import { type ModelSettings, type OneOffItem, type ReoccurringItem } from "../src/types";

const signal = new AbortController().signal;
const now = 1_700_000_000_000;
const block = 840_000;
const price = 64_000;
const cagrSettings: ModelSettings = { minMaxMultiple: 2, variable: 20 };

const boundSlot = (): BoundSlot => ({
  key: "",
  logs: new Float64Array(0),
  points: new Float64Array(0),
  seriesHash: "",
  weeks: 0,
});

const cashSlot = (): CashflowSlot => ({
  bitcoin: new Float64Array(0),
  fiat: new Float64Array(0),
  key: "",
  seriesHash: "",
  weeks: 0,
});

const needed = (weeksSince: number, dataLength: number): number =>
  chartWeeksCovered(weeksSince, allocatedEpochs(weeksSince, dataLength));

const seriesAt = (series: Float64Array[] | undefined, index: number): number => {
  const row = series?.[0];
  if (row === undefined) throw new Error("missing series");
  return numberAt(row, index);
};

test("a shorter bound request keeps the long series", () => {
  const handlers = [
    [handleMinArray, handleMinModel],
    [handleMaxArray, handleMaxModel],
  ] as const;

  for (const [handler, dataset] of handlers) {
    const slot = boundSlot();
    const first = handler(signal, "series", block, cagrSettings, "CAGR", price, now, 40, 0, slot);
    expect(first[0]?.length).toBe(needed(0, 40));
    const keptHash = slot.seriesHash;
    const shorter = handler(signal, "series", block, cagrSettings, "CAGR", price, now, 10, 0, slot);
    expect(shorter[0]).toBe(first[0]);
    expect(shorter[1]).toBe(first[1]);
    expect(slot.seriesHash).toBe(keptHash);
    const points = dataset(signal, "series", true, shorter, now, 10);
    expect(points[0]?.data.length).toBe(10);
    expect(points[0]?.data[9]?.y).toBe(seriesAt(shorter, 9));

    const grownSlot = boundSlot();
    const partial = handler(
      signal,
      "series",
      block,
      cagrSettings,
      "CAGR",
      price,
      now,
      40,
      0,
      grownSlot,
    );
    const partialHash = grownSlot.seriesHash;
    const extensions: { next: string; previous: string }[] = [];
    const onExtend = (previous: string, next: string): void => {
      extensions.push({ next, previous });
    };
    const grown = handler(
      signal,
      "series",
      block,
      cagrSettings,
      "CAGR",
      price,
      now,
      300,
      0,
      grownSlot,
      onExtend,
    );
    expect(extensions).toEqual([{ next: grownSlot.seriesHash, previous: partialHash }]);
    const oneShotSlot = boundSlot();
    const oneShot = handler(
      signal,
      "series",
      block,
      cagrSettings,
      "CAGR",
      price,
      now,
      300,
      0,
      oneShotSlot,
    );
    expect(grownSlot.seriesHash).toBe(oneShotSlot.seriesHash);
    const span = needed(0, 40);
    expect(grown[0]?.length).toBe(needed(0, 300));
    expect(Array.from(grown[0] ?? [])).toEqual(Array.from(oneShot[0] ?? []));
    expect(Array.from(grown[1] ?? [])).toEqual(Array.from(oneShot[1] ?? []));
    expect(seriesAt(grown, 0)).toBe(seriesAt(partial, 0));
    expect(seriesAt(grown, span - 1)).toBe(seriesAt(partial, span - 1));

    extensions.length = 0;
    const replaced = handler(
      signal,
      "series",
      block + 1,
      cagrSettings,
      "CAGR",
      price,
      now,
      40,
      0,
      grownSlot,
      onExtend,
    );
    expect(replaced[0] === grown[0]).toBe(false);
    expect(extensions.length).toBe(0);

    const pricedHash = grownSlot.seriesHash;
    const repriced = handler(
      signal,
      "series",
      block,
      cagrSettings,
      "CAGR",
      price + 1,
      now,
      10,
      0,
      grownSlot,
      onExtend,
    );
    expect(extensions.length).toBe(0);
    const repricedFull = handler(
      signal,
      "series",
      block,
      cagrSettings,
      "CAGR",
      price + 1,
      now,
      300,
      0,
      boundSlot(),
    );
    expect(repriced[0]?.length).toBe(needed(0, 300));
    expect(Array.from(repriced[0] ?? [])).toEqual(Array.from(repricedFull[0] ?? []));
    expect(Array.from(repriced[1] ?? [])).toEqual(Array.from(repricedFull[1] ?? []));
    expect(grownSlot.seriesHash === pricedHash).toBe(false);
    expect(seriesAt(repriced, 0) === seriesAt(grown, 0)).toBe(false);
    expect(seriesAt(repriced, needed(0, 300) - 1) === seriesAt(grown, needed(0, 300) - 1)).toBe(
      false,
    );
  }
});

test("a shorter cashflow request keeps the column and a longer one matches a one-shot series", () => {
  const factors = handleInflationFactors(signal, "series", 0.001);
  const flow: ReoccurringItem = {
    active: true,
    annualAmount: 5_200,
    annualPercentChange: 10,
    effective: new Date(now - MS_PER_WEEK),
    expense: false,
    id: "flow",
    isFiat: true,
    name: "flow",
  };
  const once: OneOffItem = {
    active: true,
    amountToday: 50,
    effective: new Date(now + 199 * MS_PER_WEEK),
    expense: false,
    id: "once",
    isFiat: true,
    name: "once",
  };
  const extensions: { next: string; previous: string }[] = [];
  const onExtend = (previous: string, next: string): void => {
    extensions.push({ next, previous });
  };
  const run = (
    slot: CashflowSlot,
    dataLength: number,
    oneOffItems: OneOffItem[],
    at = now,
    report = false,
  ): ReturnType<typeof handleDrawdownStatic> => {
    if (!report) {
      return handleDrawdownStatic(
        signal,
        "series",
        dataLength,
        at,
        oneOffItems,
        [flow],
        factors,
        0.001,
        0,
        slot,
      );
    }
    return handleDrawdownStatic(
      signal,
      "series",
      dataLength,
      at,
      oneOffItems,
      [flow],
      factors,
      0.001,
      0,
      slot,
      onExtend,
    );
  };

  const slot = cashSlot();
  const first = run(slot, 10, [once]);
  expect(first.totalWeeklyFiatItems.length).toBe(needed(0, 10));
  expect(numberAt(first.totalWeeklyFiatItems, 200) === 0).toBe(false);
  const shorter = run(slot, 5, [once]);
  expect(shorter.totalWeeklyFiatItems).toBe(first.totalWeeklyFiatItems);
  expect(shorter.totalWeeklyBitcoinItems).toBe(first.totalWeeklyBitcoinItems);
  expect(shorter.seriesHash).toBe(first.seriesHash);

  const grownSlot = cashSlot();
  const partial = run(grownSlot, 10, [once]);
  const partialHash = grownSlot.seriesHash;
  const grown = run(grownSlot, 300, [once], now, true);
  expect(extensions).toEqual([{ next: grown.seriesHash, previous: partialHash }]);
  const oneShot = run(cashSlot(), 300, [once]);
  expect(Array.from(grown.totalWeeklyFiatItems)).toEqual(Array.from(oneShot.totalWeeklyFiatItems));
  expect(Array.from(grown.totalWeeklyBitcoinItems)).toEqual(
    Array.from(oneShot.totalWeeklyBitcoinItems),
  );
  expect(numberAt(grown.totalWeeklyFiatItems, 200)).toBe(
    numberAt(partial.totalWeeklyFiatItems, 200),
  );
  expect(
    numberAt(grown.totalWeeklyFiatItems, 300) === numberAt(grown.totalWeeklyFiatItems, 0),
  ).toBe(false);

  extensions.length = 0;
  const replaced = run(grownSlot, 10, [], now, true);
  const replacedFull = run(cashSlot(), 300, []);
  expect(replaced.totalWeeklyFiatItems === grown.totalWeeklyFiatItems).toBe(false);
  expect(replaced.totalWeeklyFiatItems.length).toBe(needed(0, 300));
  expect(Array.from(replaced.totalWeeklyFiatItems)).toEqual(
    Array.from(replacedFull.totalWeeklyFiatItems),
  );
  expect(
    numberAt(replaced.totalWeeklyFiatItems, 200) === numberAt(grown.totalWeeklyFiatItems, 200),
  ).toBe(false);
  expect(extensions.length).toBe(0);

  const later = run(grownSlot, 10, [], now + MS_PER_WEEK, true);
  expect(extensions.length).toBe(0);
  const laterFull = run(cashSlot(), 300, [], now + MS_PER_WEEK);
  expect(later.totalWeeklyFiatItems.length).toBe(needed(0, 300));
  expect(Array.from(later.totalWeeklyFiatItems)).toEqual(
    Array.from(laterFull.totalWeeklyFiatItems),
  );
  expect(Array.from(later.totalWeeklyBitcoinItems)).toEqual(
    Array.from(laterFull.totalWeeklyBitcoinItems),
  );
  expect(later.seriesHash).toBe(laterFull.seriesHash);
  expect(later.seriesHash === replaced.seriesHash).toBe(false);
});
