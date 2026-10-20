/** Form 2A-r3: the headline and the end label claim only what N supports (world/spread.ts). */
import { expect, test } from "bun:test";

import { strings } from "../../src/v2/app/strings";
import { type PriceBands } from "../../src/v2/app/world/bands";
import { endSpread, NINETY_MIN, spreadOf } from "../../src/v2/app/world/spread";

const ENDS = {
  median: 67_800_000,
  p5: 59_600_000,
  p95: 77_300_000,
  min: 41_000_000,
  max: 98_200_000,
};
const line = (n: number | undefined): [string, string, string[], string[]] => {
  const s = spreadOf(ENDS, n);
  return [
    strings.headline.sentence(s, 2064),
    strings.headline.spoken(s, 2064),
    strings.chart.endLines(s, false),
    strings.chart.endLines(s, true),
  ];
};

test("N = 20 (and up, and unknown): 9 in 10 between p5 and p95; the label is median plus p5–p95", () => {
  expect(NINETY_MIN).toBe(20);
  for (const n of [20, 1000, undefined]) {
    const [sentence, spoken, label, split] = line(n);
    expect(sentence).toBe(
      "Bitcoin\u2019s median price reaches $67.8M by 2064; 9 in 10 futures end between $59.6M and $77.3M.",
    );
    expect(spoken.endsWith("9 in 10 futures end between $59.6 million and $77.3 million.")).toBe(
      true,
    );
    expect(label).toEqual(["\u20BF price \u00B7 $67.8M \u00B7 $59.6M\u201377.3M"]);
    expect(split).toEqual(["\u20BF price \u00B7 $67.8M", "$59.6M\u201377.3M"]);
  }
});

test("N = 19, 3 and 2: all N futures end between min and max; the label is median plus min–max", () => {
  for (const n of [19, 3, 2]) {
    const [sentence, spoken, label, split] = line(n);
    expect(sentence).toBe(
      `Bitcoin\u2019s median price reaches $67.8M by 2064; all ${String(n)} futures end between $41M and $98.2M.`,
    );
    expect(
      spoken.endsWith(`all ${String(n)} futures end between $41 million and $98.2 million.`),
    ).toBe(true);
    expect(label).toEqual(["\u20BF price \u00B7 $67.8M \u00B7 $41M\u201398.2M"]);
    expect(split).toEqual(["\u20BF price \u00B7 $67.8M", "$41M\u201398.2M"]);
    // No 9-in-10 claim and no p5 / p95 anywhere.
    expect([sentence, ...label].some((t) => t.includes("9 in 10") || t.includes("59.6"))).toBe(
      false,
    );
  }
});

test("N = 2 is no special case (user ruling 2A-r5): the median clause plus all 2 between min and max", () => {
  expect(spreadOf(ENDS, 2)).toEqual({
    kind: "all",
    n: 2,
    median: 67_800_000,
    low: 41_000_000,
    high: 98_200_000,
  });
  const [sentence, spoken, label] = line(2);
  expect(sentence).toBe(
    "Bitcoin\u2019s median price reaches $67.8M by 2064; all 2 futures end between $41M and $98.2M.",
  );
  expect(spoken).toBe(
    "Bitcoin\u2019s median price reaches $67.8 million by 2064; all 2 futures end between $41 million and $98.2 million.",
  );
  expect(label).toEqual(["\u20BF price \u00B7 $67.8M \u00B7 $41M\u201398.2M"]);
});

test("N = 1 (Form 2A-r4): one clause, 'in this one future'; the label is the single value", () => {
  const one = { ...ENDS, p5: ENDS.median, p95: ENDS.median, min: ENDS.median, max: ENDS.median };
  const s = spreadOf(one, 1);
  expect(s).toEqual({ kind: "one", value: 67_800_000 });
  expect(strings.headline.sentence(s, 2064)).toBe(
    "Bitcoin\u2019s price reaches $67.8M by 2064 in this one future.",
  );
  expect(strings.headline.spoken(s, 2064)).toBe(
    "Bitcoin\u2019s price reaches $67.8 million by 2064 in this one future.",
  );
  expect(strings.chart.endLines(s, false)).toEqual(["\u20BF price \u00B7 $67.8M"]);
  expect(strings.chart.endLines(s, true)).toEqual(["\u20BF price \u00B7 $67.8M"]);
});

test("N > 1 with min and max equal once rounded: all N futures end at one value", () => {
  // $66.31M and $66.34M both show as $66.3M.
  const tight = {
    median: 66_320_000,
    p5: 66_310_000,
    p95: 66_340_000,
    min: 66_310_000,
    max: 66_340_000,
  };
  const at3 = spreadOf(tight, 3);
  expect(at3).toEqual({ kind: "allAt", n: 3, value: 66_310_000 });
  expect(strings.headline.sentence(at3, 2064)).toBe(
    "Bitcoin\u2019s median price reaches $66.3M by 2064; all 3 futures end at $66.3M.",
  );
  expect(strings.chart.endLines(at3, true)).toEqual(["\u20BF price \u00B7 $66.3M"]);
  // At N = 2 the same as N = 3, median clause included.
  const at2 = spreadOf(tight, 2);
  expect(at2).toEqual({ kind: "allAt", n: 2, value: 66_310_000 });
  expect(strings.headline.sentence(at2, 2064)).toBe(
    "Bitcoin\u2019s median price reaches $66.3M by 2064; all 2 futures end at $66.3M.",
  );
  expect(strings.chart.endLines(at2, false)).toEqual(["\u20BF price \u00B7 $66.3M"]);
  // One digit apart once rounded is a range again.
  expect(spreadOf({ ...tight, max: 66_360_000 }, 3).kind).toBe("all");
  expect(spreadOf({ ...tight, max: 66_360_000 }, 2).kind).toBe("all");
  // At N ≥ 20 the rule stays 9 in 10, even with a tight spread.
  expect(spreadOf(tight, 20).kind).toBe("ninety");
});

const f = (...v: number[]): Float64Array => Float64Array.from(v);

test("endSpread reads the horizon's last finite values and the run's N", () => {
  const bands: PriceBands = {
    start: 0,
    weeks: 1,
    min: f(1, 41e6),
    p1: f(1, 50e6),
    p5: f(1, 59.6e6),
    p25: f(1, 63e6),
    p50: f(1, 67.8e6),
    p75: f(1, 72e6),
    p95: f(1, 77.3e6),
    p99: f(1, 90e6),
    max: f(1, Number.NaN),
  };
  expect(endSpread(bands)).toEqual({ kind: "ninety", median: 67.8e6, low: 59.6e6, high: 77.3e6 });
  expect(endSpread({ ...bands, n: 5 })).toEqual({
    kind: "all",
    n: 5,
    median: 67.8e6,
    low: 41e6,
    high: 1,
  });
  expect(endSpread({ ...bands, n: 1 })).toEqual({ kind: "one", value: 67.8e6 });
});
