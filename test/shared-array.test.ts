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

test("growing the width keeps the old last column and leaves the new one empty", () => {
  const array = new GrowableSharedArray(2, 2, 3);
  const oldLast = new Float64Array([4, 5, 6]);
  const bottom = new Float64Array([7, 8, 9]);
  array.set(0, 0, new Float64Array([1, 2, 3]));
  array.set(1, 0, oldLast);
  array.set(0, 1, new Float64Array([7, 8, 9]));
  array.set(1, 1, bottom);

  array.resize(3, 2);

  expect(array.get(1, 0)).toEqual(oldLast);
  expect(array.get(1, 1)).toEqual(bottom);
  expect(array.get(2, 0)).toBeUndefined();
  expect(array.get(2, 1)).toBeUndefined();
  expect(Array.from(array.getLastArray())).toEqual([0, 0]);

  array.set(2, 1, new Float64Array([1, 1, 5]));

  expect(array.get(1, 1)).toEqual(bottom);
  expect(array.getLastArray()[1]).toBe(5);
});

test("coalesce stops at the active end of a row", () => {
  const array = new GrowableSharedArray(1, 1, 2);
  array.set(0, 0, new Float64Array([3, 4]));
  array.resize(3, 1);
  array.resize(1, 1);

  const rows = array.coalesce(0);
  const tail = array.coalesce(1);
  const row = rows[0];
  const end = tail[0];
  if (row === undefined || end === undefined) throw new Error("missing coalesced row");

  expect(rows.length).toBe(1);
  expect(Array.from(row)).toEqual([3, 4]);
  expect(Array.from(end)).toEqual([4]);
});

test("a zero-width grid has no final price", () => {
  const array = new GrowableSharedArray(1, 2, 2);
  array.set(0, 0, new Float64Array([1, 2]));
  array.set(0, 1, new Float64Array([3, 4]));

  array.resize(0, 2);

  const last = array.getLastArray();
  expect(last.length).toBe(2);
  expect(Number.isNaN(last[0])).toBe(true);
  expect(Number.isNaN(last[1])).toBe(true);
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

test("a drawdown cache stays open until every valid sample is set", () => {
  const cache = new VariableDrawdownCache();
  cache.setValidity("same", 4, 1);
  cache.set(0, 1, 1);
  cache.set(1, 1, 1);
  cache.set(2, 1, 1);

  expect(cache.isFull()).toBe(false);

  cache.set(3, 1, 1);

  expect(cache.isFull()).toBe(true);
});
