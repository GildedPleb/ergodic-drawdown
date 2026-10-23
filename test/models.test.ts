import { afterAll, beforeAll, expect, test } from "bun:test";

import { MS_PER_DAY } from "../src/constants";
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

const rainbowWeek = (refit: string, week: number) => ({
  ...frozenOptions,
  settings: { refit },
  week,
});

const band2014 = (unixTimeMs: number, slope: number, daysAdded: number): number => {
  const days = (unixTimeMs - Date.UTC(2012, 0, 1)) / MS_PER_DAY + daysAdded;
  return 10 ** (slope * Math.log(days) - 19.493);
};

const expectedPrices = {
  CAGR: { max: 143_928.088_361_338_04, min: 35_982.022_090_334_51 },
  Historic: { max: 341_547.976_727_618_66, min: 85_074.99 },
  "Power Law": { max: 315_458.563_801_796_64, min: 50_750.076_679_694_284 },
  Rainbow: { max: 771_304.345_178_012_2, min: 65_706.921_686_572_95 },
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
  if (name === "Rainbow") return ["Refit"];
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
  expect(declaredSettings("Rainbow")).toEqual({ refit: "2022" });
  expect(declaredSettings("Rainbow", { refit: "2014" })).toEqual({ refit: "2014" });
  expect(declaredSettings("Rainbow", { refit: "2022-violet" })).toEqual({ refit: "2022-violet" });
  expect(declaredSettings("Rainbow", { refit: "2019" })).toEqual({ refit: "2022" });
  expect(declaredSettings("Rainbow", { refit: 2022 })).toEqual({ refit: "2022" });
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

test("Rainbow 2014 is the lower band, and 2022 violet lowers only the floor", () => {
  const model = modelMap.Rainbow;
  const floor = (refit: string, week: number): number => model.minPrice(rainbowWeek(refit, week));
  const ceiling = (refit: string, week: number): number => model.maxPrice(rainbowWeek(refit, week));
  expect(floor("2014", 0)).toBe(band2014(now, 2.788, 1200));
  expect(ceiling("2014", 0)).toBe(band2014(now, 2.9, 1400));
  expect(floor("2014", 0)).toBe(41_192.548_653_331_294);
  expect(ceiling("2014", 0)).toBe(482_405.927_492_847);
  expect(floor("2014", 520)).toBe(983_964.020_891_537_1);
  expect(ceiling("2014", 520)).toBe(11_975_530.180_339_318);
  expect(ceiling("2014", 0) > floor("2014", 0)).toBe(true);
  expect(floor("2014", 0) < floor("2022", 0)).toBe(true);
  expect(ceiling("2014", 0) < ceiling("2022", 0)).toBe(true);
  expect(ceiling("2014", 0) / floor("2014", 0) === ceiling("2014", 520) / floor("2014", 520)).toBe(
    false,
  );

  expect(floor("2022", 0)).toBe(44_138.611_113_983_6);
  expect(ceiling("2022", 0)).toBe(516_907.264_269_635_7);
  expect(floor("2022-violet", 0)).toBe(33_127.976_177_143_566);
  expect(ceiling("2022-violet", 0)).toBe(ceiling("2022", 0));
  expect(floor("2022", 520)).toBe(1_054_336.444_044_495_7);
  expect(ceiling("2022", 520)).toBe(12_832_011.778_689_103);
  expect(floor("2022-violet", 520)).toBe(788_313.359_799_454_6);
  expect(ceiling("2022-violet", 520)).toBe(ceiling("2022", 520));
  expect(ceiling("2022", 0) / floor("2022", 0) === ceiling("2022", 520) / floor("2022", 520)).toBe(
    false,
  );
  expect(
    ceiling("2022-violet", 0) / floor("2022-violet", 0) ===
      ceiling("2022-violet", 520) / floor("2022-violet", 520),
  ).toBe(false);
  expect(floor("2022-violet", 0) < floor("2022", 0)).toBe(true);
  expect(floor("no", 0)).toBe(floor("2022", 0));
  expect(ceiling("no", 520)).toBe(ceiling("2022", 520));
});

test("Rainbow refit lists 2014, 2022, and 2022 violet, and defaults to 2022", () => {
  const refit = modelMap.Rainbow.params.find((param) => param.key === "refit");
  if (refit?.kind !== "choice") throw new Error("Rainbow refit");
  expect(refit.label).toBe("Refit");
  expect(refit.default).toBe("2022");
  expect(refit.options).toEqual([
    { label: "2014", value: "2014" },
    { label: "2022", value: "2022" },
    { label: "2022 violet", value: "2022-violet" },
  ]);
});

test("CAGR rate defaults to 20 percent and is capped at 1000 percent", () => {
  const rate = modelMap.CAGR.params.find((param) => param.key === "variable");
  if (rate?.kind !== "number") throw new Error("CAGR rate");
  expect(rate.default).toBe(20);
  expect(rate.max).toBe(1000);
});
