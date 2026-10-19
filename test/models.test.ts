import { afterAll, beforeAll, expect, test } from "bun:test";

import { modelMap } from "../src/data/models";
import { type MinMaxOptions } from "../src/types";
import { installFrozenClock } from "./freeze-clock";

const now = 1_713_571_767_000;

const frozenOptions = {
  currentBlock: 840_000,
  currentPrice: 60_000,
  minMaxMultiple: 2,
  now,
  week: 52,
} as const;

const expectedPrices = {
  CAGR: { max: 179_800.155_624_663_72, min: 44_950.038_906_165_93 },
  Historic: { max: 341_547.976_727_618_66, min: 85_074.99 },
  "Power Law Regression Median": { max: 315_458.563_801_796_64, min: 50_750.076_679_694_284 },
  "Power Law Support Line": { max: 236_638.933_971_322_14, min: 42_964.275_835_303_255 },
  "Rainbow Chart": { max: 238_037.259_215_908_53, min: 23_803.725_921_590_856 },
  "Stock-To-Flow": { max: 1_528_541.594_949_629_9, min: 324_236.095_898_406_35 },
  "Stock-To-Flow 2024 Refit": { max: 735_419.854_861_576_8, min: 140_079.972_354_586 },
} as const;

let restoreClock = (): void => undefined;

beforeAll(() => {
  restoreClock = installFrozenClock(now);

  const values = new Map<string, string>();
  globalThis.localStorage = {
    clear: () => {
      values.clear();
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
});

afterAll(() => {
  restoreClock();
});

for (const model of Object.values(modelMap)) {
  test(`${model.modelType} prices stay fixed for one week and one now`, () => {
    const expected = expectedPrices[model.modelType];
    const options: MinMaxOptions = { ...frozenOptions, variable: model.default };

    expect(model.minPrice(options)).toBe(expected.min);
    expect(model.maxPrice(options)).toBe(expected.max);
  });
}

test("CAGR rate is capped at 1000 percent", () => {
  expect(modelMap.CAGR.rangeMax).toBe(1000);
});
