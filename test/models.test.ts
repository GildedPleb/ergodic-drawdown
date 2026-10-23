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

const powerLawWeek = (yearOffset: number) => ({
  ...frozenOptions,
  settings: declaredSettings("Power Law", { yearOffset }),
});

const expectedPrices = {
  CAGR: { max: 143_928.088_361_338_04, min: 35_982.022_090_334_51 },
  Historic: { max: 341_547.976_727_618_66, min: 85_074.99 },
  "Power Law": { max: 315_458.563_801_796_64, min: 50_750.076_679_694_284 },
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
  if (name === "Power Law") return ["Shift (years)"];
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
  expect(declaredSettings("Power Law", { variable: 9 })).toEqual({ yearOffset: 6 });
  expect(declaredSettings("Power Law", { yearOffset: 7.5 })).toEqual({ yearOffset: 7.5 });
  expect(declaredSettings("Power Law", { yearOffset: "no" })).toEqual({ yearOffset: 6 });
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

test("Power Law shift of 6 keeps today's ceiling, 0 is one line, and 6.1 moves only the ceiling", () => {
  const model = modelMap["Power Law"];
  const six = powerLawWeek(6);
  const zero = powerLawWeek(0);
  const tenth = powerLawWeek(6.1);
  expect(model.minPrice(six)).toBe(50_750.076_679_694_284);
  expect(model.maxPrice(six)).toBe(315_458.563_801_796_64);
  expect(model.maxPrice(zero)).toBe(model.minPrice(zero));
  expect(model.minPrice(zero)).toBe(model.minPrice(six));
  expect(model.minPrice(tenth)).toBe(model.minPrice(six));
  expect(model.maxPrice(tenth) > model.maxPrice(six)).toBe(true);
});

test("Power Law shift defaults to 6, steps by a tenth, and stays from 0 through 30", () => {
  const shift = modelMap["Power Law"].params.find((param) => param.key === "yearOffset");
  if (shift?.kind !== "number") throw new Error("Power Law shift");
  expect(shift.label).toBe("Shift (years)");
  expect(shift.default).toBe(6);
  expect(shift.step).toBe(0.1);
  expect(shift.min).toBe(0);
  expect(shift.max).toBe(30);
});

test("CAGR rate defaults to 20 percent and is capped at 1000 percent", () => {
  const rate = modelMap.CAGR.params.find((param) => param.key === "variable");
  if (rate?.kind !== "number") throw new Error("CAGR rate");
  expect(rate.default).toBe(20);
  expect(rate.max).toBe(1000);
});
