import { afterAll, beforeAll, expect, test } from "bun:test";

import { declaredSettings, modelMap, savedKnobs } from "../src/data/models";
import { installFrozenClock } from "./freeze-clock";

const now = 1_713_571_767_000;

const frozenOptions = {
  currentBlock: 840_000,
  currentPrice: 60_000,
  now,
  week: 52,
} as const;

const expectedPrices = {
  CAGR: { max: 143_928.088_361_338_04, min: 35_982.022_090_334_51 },
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

const knobLabels = (name: string): readonly string[] | undefined => {
  if (name === "CAGR") return ["R (%)", "+/-"];
  if (name === "Historic") return ["Previous Halvings"];
  return undefined;
};

const variableDefault = (params: (typeof modelMap)[keyof typeof modelMap]["params"]): number => {
  const setting = params.find((param) => param.kind === "number" && param.key === "variable");
  return setting?.kind === "number" ? setting.default : 0;
};

for (const model of Object.values(modelMap)) {
  test(`${model.name} prices stay fixed for one week and one now`, () => {
    const expected = expectedPrices[model.name];
    const options = {
      ...frozenOptions,
      settings: declaredSettings(model.name, {
        minMaxMultiple: 2,
        variable: variableDefault(model.params),
      }),
    };

    expect(model.minPrice(options)).toBe(expected.min);
    expect(model.maxPrice(options)).toBe(expected.max);
  });

  test(`${model.name} carries a one-line summary, a longer description, and its own settings`, () => {
    expect(model.summary).toBe(model.summary.trim());
    expect(model.summary.includes("\n")).toBe(false);
    expect(model.summary.endsWith(".")).toBe(true);
    expect(model.description.length).toBeGreaterThanOrEqual(model.summary.length + 1);
    const labels = knobLabels(model.name);
    expect(model.params.map((param) => param.label)).toEqual(
      labels === undefined ? [] : [...labels],
    );
  });
}

test("declared settings keep only the keys that model lists", () => {
  expect(declaredSettings("CAGR", { extra: 1, minMaxMultiple: 2, variable: 20 })).toEqual({
    minMaxMultiple: 2,
    variable: 20,
  });
  expect(declaredSettings("CAGR", { minMaxMultiple: 2, variable: "no" })).toEqual({
    minMaxMultiple: 2,
    variable: 20,
  });
  expect(declaredSettings("Historic", { minMaxMultiple: 2, variable: 2 })).toEqual({
    variable: 2,
  });
  expect(declaredSettings("Historic")).toEqual({ variable: 2 });
  expect(declaredSettings("Power Law Regression Median", { variable: 9 })).toEqual({});
});

test("a version-1 file keeps the two old keys and fills a missing one", () => {
  expect(savedKnobs({ minMaxMultiple: 4, variable: 7 })).toEqual({
    minMaxMultiple: 4,
    variable: 7,
  });
  expect(savedKnobs({})).toEqual({ minMaxMultiple: 3, variable: 0 });
  expect(savedKnobs({ minMaxMultiple: "no", variable: "no" })).toEqual({
    minMaxMultiple: 3,
    variable: 0,
  });
});

test("CAGR rate defaults to 20 percent and is capped at 1000 percent", () => {
  const rate = modelMap.CAGR.params.find((param) => param.key === "variable");
  if (rate?.kind !== "number") throw new Error("CAGR rate");
  expect(rate.default).toBe(20);
  expect(rate.max).toBe(1000);
});
