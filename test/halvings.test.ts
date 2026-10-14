import { beforeEach, expect, test } from "bun:test";

import { loadHalvings } from "../src/halvings";

const memoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
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
};

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

test("an empty halving store is the baked times", () => {
  const loaded = loadHalvings();

  expect(loaded["210000"]).toBe(1_354_116_278);
  expect(loaded["420000"]).toBe(1_468_082_773);
  expect(loaded["630000"]).toBe(1_589_225_023);
  expect(loaded["840000"]).toBe(1_713_571_767);
});

test("a caller cannot replace a baked halving time", () => {
  const loaded = loadHalvings();
  loaded["840000"] = 1;

  expect(loadHalvings()["840000"]).toBe(1_713_571_767);
});

test("a partial stored halving map keeps the baked times", () => {
  localStorage.setItem("halvings", JSON.stringify({ "210000": 1, "1050000": 1_900_000_000 }));
  const loaded = loadHalvings();

  expect(loaded["210000"]).toBe(1_354_116_278);
  expect(loaded["840000"]).toBe(1_713_571_767);
  expect(loaded["1050000"]).toBe(1_900_000_000);
});

test("an empty stored halving map is the baked times", () => {
  localStorage.setItem("halvings", "{}");

  expect(loadHalvings()["840000"]).toBe(1_713_571_767);
});

test("a broken stored halving map is the baked times", () => {
  localStorage.setItem("halvings", "{");

  expect(loadHalvings()["840000"]).toBe(1_713_571_767);
});

test("a non-positive stored halving is dropped", () => {
  localStorage.setItem("halvings", JSON.stringify({ "1050000": 0, next: 1_900_000_000 }));
  const loaded = loadHalvings();

  expect(loaded["1050000"]).toBeUndefined();
  expect(loaded["next"]).toBeUndefined();
  expect(loaded["840000"]).toBe(1_713_571_767);
});
