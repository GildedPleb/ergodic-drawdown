import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import { handleVolumeCalculation } from "../src/contexts/workers/volume";

test("a cached volume epoch that ends in NaN keeps the running balance", () => {
  const length = 4;
  const weeksSince = 5;
  const prices = new GrowableSharedArray(2, 1, length);
  const volume = new GrowableSharedArray(2, 1, length);
  const blank = new Float64Array(length);
  blank.fill(Number.NaN);
  prices.set(0, 0, blank);
  // The first week of the second epoch is still before the cashflow series.
  prices.set(1, 0, new Float64Array([Number.NaN, 100, 100, 100]));
  volume.set(0, 0, blank);

  handleVolumeCalculation(
    {
      bitcoin: 2,
      drawdownExport: volume.exportState(),
      epochCount: 2,
      exportedVariableCache: {
        buffer: new SharedArrayBuffer(0),
        sampleCount: 1,
        weekCount: 0,
      },
      simulationExport: prices.exportState(),
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      totalWeeklyBitcoinItems: new Float64Array(3),
      totalWeeklyFiatItems: new Float64Array(3),
      weeksSince,
    },
    { aborted: false },
  );

  const next = volume.get(1, 0);
  if (next === undefined) throw new Error("missing continued volume");
  expect(Number.isNaN(next[0])).toBe(true);
  expect(next[1]).toBe(2);
  expect(next[length - 1]).toBe(2);
});

test("a finite price before the cashflow series does not wipe the balance", () => {
  const length = 4;
  const prices = new GrowableSharedArray(1, 1, length);
  const volume = new GrowableSharedArray(1, 1, length);
  prices.set(0, 0, new Float64Array([100, 100, 100, 100]));

  handleVolumeCalculation(
    {
      bitcoin: 2,
      drawdownExport: volume.exportState(),
      epochCount: 1,
      exportedVariableCache: {
        buffer: new SharedArrayBuffer(0),
        sampleCount: 1,
        weekCount: 0,
      },
      simulationExport: prices.exportState(),
      task: { arrayIndex: 0, endIndex: 1, startIndex: 0 },
      totalWeeklyBitcoinItems: new Float64Array(3),
      totalWeeklyFiatItems: new Float64Array(3),
      weeksSince: 1,
    },
    { aborted: false },
  );

  const row = volume.get(0, 0);
  if (row === undefined) throw new Error("missing volume row");
  expect(Number.isNaN(row[0])).toBe(true);
  expect(row[1]).toBe(2);
  expect(row[length - 1]).toBe(2);
});
