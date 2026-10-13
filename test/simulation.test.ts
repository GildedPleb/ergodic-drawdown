import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import { WEEKS_PER_EPOCH } from "../src/constants";
import { handleSimulation } from "../src/contexts/workers/simulation";

const weeks = WEEKS_PER_EPOCH;
const minPrice = 100;
const maxPrice = 1000;

const flat = (price: number): Float64Array => {
  const values = new Float64Array(weeks);
  values.fill(price);
  return values;
};

const minArray = [flat(minPrice), flat(Math.log10(minPrice))];
const maxArray = [flat(maxPrice), flat(Math.log10(maxPrice))];

const sample = (currentPrice: number, weeksSince: number): Float64Array => {
  const data = new GrowableSharedArray(1, 1, weeks);
  handleSimulation(
    {
      bufferState: data.exportState(),
      currentPrice,
      epochCount: 1,
      full: {
        clampBottom: false,
        clampTop: false,
        minMaxMultiple: 1,
        model: "CAGR",
        variable: 1,
        volatility: 0,
        walk: "Random",
      },
      maxArray,
      minArray,
      samples: 1,
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      weeksSince,
    },
    { aborted: false },
  );
  const row = data.get(0, 0);
  if (row === undefined) {
    throw new Error("missing sample");
  }
  return row;
};

test("a flat walk maps back through the stored price bounds", () => {
  const inside = sample(10 ** 2.5, 2);
  expect(Number.isNaN(inside[0])).toBe(true);
  expect(Number.isNaN(inside[1])).toBe(true);
  expect(inside[2]).toBe(10 ** 2.5);
  expect(inside[weeks - 1]).toBe(10 ** 2.5);

  const below = sample(10, 0);
  expect(below[0]).toBe(10);
  expect(below[weeks - 1]).toBe(10);

  const above = sample(10_000, 0);
  expect(above[0]).toBe(10_000);
  expect(above[weeks - 1]).toBe(10_000);

  const floored = sample(0.001, 0);
  expect(floored[0]).toBe(0.01);
  expect(floored[weeks - 1]).toBe(0.01);
});
