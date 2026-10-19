import { expect, test } from "bun:test";

import type { EngineConfig } from "../../src/engine/keys";
import { coalesce } from "../../src/v2/app/engine/coalesce";
import { fetchInputs, type InputsIO } from "../../src/v2/app/engine/inputs";
import { engineConfig, type WorldInputs } from "../../src/v2/app/engine/config";
import { defaultModelsValues } from "../../src/v2/app/models/values";
import { keyStep, snap, trackValue } from "../../src/v2/design/primitives/Slider/Slider";

const VOL = { min: 0, max: 1, step: 0.01 };

test("slider: snap rounds to the step and clamps to the bounds without float dust", () => {
  expect(snap(0.304_999, 0, 1, 0.01)).toBe(0.3);
  expect(snap(1.7, 0, 1, 0.01)).toBe(1);
  expect(snap(-3, 0, 1, 0.01)).toBe(0);
});

test("slider: arrows step, Page keys step ×10, Home/End jump, other keys are not ours", () => {
  expect(keyStep("ArrowRight", 0.5, VOL)).toBe(0.51);
  expect(keyStep("ArrowDown", 0.5, VOL)).toBe(0.49);
  expect(keyStep("PageUp", 0.5, VOL)).toBe(0.6);
  expect(keyStep("PageDown", 0.05, VOL)).toBe(0);
  expect(keyStep("Home", 0.5, VOL)).toBe(0);
  expect(keyStep("End", 0.5, VOL)).toBe(1);
  expect(keyStep("a", 0.5, VOL)).toBe(null);
});

test("slider: the pointer maps across the track box and clamps past its ends", () => {
  expect(trackValue(150, { left: 100, width: 200 }, VOL)).toBe(0.25);
  expect(trackValue(400, { left: 100, width: 200 }, VOL)).toBe(1);
  expect(trackValue(150, { left: 100, width: 0 }, VOL)).toBe(null);
  expect(trackValue(150, undefined, VOL)).toBe(null);
});

const io = (saved: string[][]): InputsIO => ({
  price: async () => ({ close: 100_000 }),
  height: async () => 840_100,
  block: async (h) => h,
  interim: async () => [],
  load: () => ({ "210000": 1 }),
  save: (d) => {
    saved.push(Object.keys(d));
  },
});

test("inputs: price, block + halvings and interim each merge; only missing halvings are fetched", async () => {
  const saved: string[][] = [];
  const got: Partial<WorldInputs> = {};
  await fetchInputs(1, (p) => Object.assign(got, p), io(saved));
  expect(got.currentPrice).toBe(100_000);
  expect(got.currentBlock).toBe(840_100);
  expect(got.interim).toEqual([]);
  expect(Object.keys(got.halvings ?? {})).toEqual(["210000", "420000", "630000", "840000"]);
  expect(saved.length).toBe(3);
});

test("inputs: a failed fetch merges nothing and leaves the others to land", async () => {
  const got: Partial<WorldInputs> = {};
  const failing: InputsIO = { ...io([]), price: async () => Promise.reject(new Error("down")) };
  await fetchInputs(1, (p) => Object.assign(got, p), failing);
  expect(got.currentPrice).toBe(undefined);
  expect(got.currentBlock).toBe(840_100);
});

/** A fake engine whose runs end only when the test says so. */
const fakeEngine = (): {
  engine: { set: (c: EngineConfig) => void; settled: () => Promise<"quiet"> };
  seen: EngineConfig[];
  finish: () => Promise<void>;
} => {
  const seen: EngineConfig[] = [];
  let release: (() => void)[] = [];
  return {
    seen,
    engine: {
      set: (config) => {
        seen.push(config);
      },
      settled: () =>
        new Promise((resolve) => {
          release.push(() => {
            resolve("quiet");
          });
        }),
    },
    finish: async () => {
      const now = release;
      release = [];
      for (const run of now) run();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
};

test("B1: one engine job at a time; commits during a run coalesce to the latest", async () => {
  const fake = fakeEngine();
  const { set, jobs } = coalesce(fake.engine);
  const inputs = { currentBlock: 1, currentPrice: 2, halvings: {}, interim: [], now: 0 };
  const configs = [1001, 1002, 1003, 1004, 1005].flatMap(
    (samples) => engineConfig({ ...defaultModelsValues(), samples }, inputs) ?? [],
  );
  for (const c of configs) set(c);
  expect(fake.seen).toEqual([configs[0]]);
  expect(jobs).toEqual({ requested: 5, started: 1, inFlight: 1, maxInFlight: 1 });
  await fake.finish();
  expect(fake.seen).toEqual([configs[0], configs[4]]);
  await fake.finish();
  expect(jobs).toEqual({ requested: 5, started: 2, inFlight: 0, maxInFlight: 1 });
  for (const c of configs.slice(0, 1)) set(c);
  expect(fake.seen.length).toBe(3);
});
