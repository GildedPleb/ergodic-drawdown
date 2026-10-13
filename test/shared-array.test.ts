import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import VariableDrawdownCache from "../src/classes/variable-drawdown-cache";
import { MAX_SAMPLE_COUNT } from "../src/constants";

const cell = (last: number): Float64Array => new Float64Array([1, 2, 3, last]);

test("a growable array reads a stored sample and misses an empty cell", () => {
  const array = new GrowableSharedArray(1, 2, 4);
  const stored = cell(4);

  array.set(0, 0, stored);

  expect(array.get(0, 0)).toEqual(stored);
  expect(array.get(0, 1)).toBeUndefined();
});

test("a zero tail is an empty growable cell", () => {
  const array = new GrowableSharedArray(1, 1, 4);

  array.set(0, 0, cell(0));

  expect(array.get(0, 0)).toBeUndefined();
});

test("a growable array rejects a sample outside the active grid", () => {
  const array = new GrowableSharedArray(1, 1, 4);

  expect(() => array.set(1, 0, cell(4))).toThrow("Set Position out of bounds");
  expect(() => array.set(-1, 0, cell(4))).toThrow("Invalid parameters");
});

test("clearing a growable array drops stored samples", () => {
  const array = new GrowableSharedArray(1, 1, 4);
  array.set(0, 0, cell(4));

  array.clear();

  expect(array.get(0, 0)).toBeUndefined();
});

test("a growable array keeps a stored sample after the grid grows", () => {
  const array = new GrowableSharedArray(1, 1, 4);
  const stored = cell(4);
  array.set(0, 0, stored);

  array.resize(2, 2);

  expect(array.get(0, 0)).toEqual(stored);
  const grown = cell(9);
  array.set(1, 1, grown);
  expect(array.get(1, 1)).toEqual(grown);
});

test("an unset drawdown sample reads as an empty week", () => {
  const cache = new VariableDrawdownCache();

  expect(cache.get(1)).toEqual([-1, -1]);
});

test("a drawdown cache reads each sample back", () => {
  const cache = new VariableDrawdownCache();

  cache.set(1, 5, 100);
  cache.set(2, 9, 200);

  expect(cache.get(1)).toEqual([5, 100]);
  expect(cache.get(2)).toEqual([9, 200]);
});

test("a drawdown cache rejects a sample outside the table", () => {
  const cache = new VariableDrawdownCache();

  expect(() => cache.set(MAX_SAMPLE_COUNT, 1, 50)).toThrow("Sample index out of bounds.");
  expect(() => cache.get(-1)).toThrow("Sample index out of bounds.");
});

test("clearing a drawdown cache drops stored samples", () => {
  const cache = new VariableDrawdownCache();
  cache.set(1, 5, 100);

  cache.clear();

  expect(cache.get(1)).toEqual([-1, -1]);
});
