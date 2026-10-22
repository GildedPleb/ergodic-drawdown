import { expect, test } from "bun:test";

import GrowableSharedArray from "../src/classes/growable-shared-array";
import { WEEKS_PER_EPOCH } from "../src/constants";
import { handleSimulation } from "../src/contexts/workers/simulation";
import type { SupplementedTask } from "../src/contexts/workers/types";
import { isWalk, walks, type WalkTypes } from "../src/data/walks";
import { WALK_STATE_LENGTH } from "../src/data/walks/prng";
import { createTaskQueue } from "../src/helpers";
import { numberAt } from "../src/number-at";
import type { Full } from "../src/types";

const weeks = WEEKS_PER_EPOCH;
const minPrice = 100;
const maxPrice = 1000;
const spot = 10 ** 2.5;
const names = Object.keys(walks).filter(isWalk);

interface Grids {
  prices: GrowableSharedArray;
  states: GrowableSharedArray;
}

interface Job {
  clampBottom: boolean;
  clampTop: boolean;
  currentPrice: number;
  epochCount: number;
  samples: number;
  seed: number;
  volatility: number;
  walk: WalkTypes;
  weeksSince: number;
}

const bounds = (length: number, price: number): Float64Array[] => {
  const values = new Float64Array(length);
  values.fill(price);
  const logs = new Float64Array(length);
  logs.fill(Math.log10(price));
  return [values, logs];
};

const whole = (samples: number, startEpoch?: number): SupplementedTask =>
  startEpoch === undefined
    ? { arrayIndex: 0, endIndex: samples, startIndex: 0 }
    : { arrayIndex: 0, endIndex: samples, startEpoch, startIndex: 0 };

const run = (job: Job, tasks: SupplementedTask[], existing?: Grids): Grids => {
  const prices = existing?.prices ?? new GrowableSharedArray(job.epochCount, job.samples, weeks);
  const states =
    existing?.states ?? new GrowableSharedArray(job.epochCount, job.samples, WALK_STATE_LENGTH);
  const length = job.epochCount * weeks - job.weeksSince;
  const minArray = bounds(length, minPrice);
  const maxArray = bounds(length, maxPrice);
  const full: Full = {
    clampBottom: job.clampBottom,
    clampTop: job.clampTop,
    model: "CAGR",
    seed: job.seed,
    settings: { minMaxMultiple: 1, variable: 1 },
    volatility: job.volatility,
    walk: job.walk,
  };
  for (const task of tasks) {
    handleSimulation(
      {
        bufferState: prices.exportState(),
        currentPrice: job.currentPrice,
        epochCount: job.epochCount,
        full,
        maxArray,
        minArray,
        samples: job.samples,
        stateBuffer: states.exportState(),
        task,
        weeksSince: job.weeksSince,
      },
      { aborted: false },
    );
  }
  return { prices, states };
};

const jobFor = (
  walk: WalkTypes,
  samples: number,
  epochCount: number,
  overrides: Partial<Job> = {},
): Job => ({
  clampBottom: false,
  clampTop: false,
  currentPrice: spot,
  epochCount,
  samples,
  seed: 1,
  volatility: 0.1,
  walk,
  weeksSince: 0,
  ...overrides,
});

const expectMatch = (
  walk: WalkTypes,
  left: Grids,
  right: Grids,
  epochs: number,
  samples: number,
  fromSample = 0,
): void => {
  for (let sample = fromSample; sample < fromSample + samples; sample++) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      const priceA = left.prices.get(epoch, sample);
      const priceB = right.prices.get(epoch, sample);
      if ((priceA === undefined) !== (priceB === undefined)) {
        throw new Error(`${walk} epoch ${epoch} sample ${sample} week 0`);
      }
      if (priceA !== undefined && priceB !== undefined) {
        for (let week = 0; week < priceA.length; week++) {
          if (!Object.is(numberAt(priceA, week), numberAt(priceB, week))) {
            throw new Error(`${walk} epoch ${epoch} sample ${sample} week ${week}`);
          }
        }
      }
      const stateA = left.states.get(epoch, sample);
      const stateB = right.states.get(epoch, sample);
      if ((stateA === undefined) !== (stateB === undefined)) {
        throw new Error(`${walk} epoch ${epoch} sample ${sample} week 0`);
      }
      if (stateA !== undefined && stateB !== undefined) {
        for (let slot = 0; slot < WALK_STATE_LENGTH; slot++) {
          if (!Object.is(numberAt(stateA, slot), numberAt(stateB, slot))) {
            throw new Error(`${walk} epoch ${epoch} sample ${sample} week ${slot}`);
          }
        }
      }
    }
  }
};

const cover = (tasks: SupplementedTask[], samples: number): void => {
  const seen = Array.from({ length: samples }, () => 0);
  for (const task of tasks) {
    if (task.arrayIndex !== 0) throw new Error(`${task.arrayIndex} split the sample range`);
    for (let sample = task.startIndex; sample < task.endIndex; sample++) {
      const count = seen[sample];
      if (count === undefined) throw new Error(`sample ${sample} is outside 0..${samples}`);
      seen[sample] = count + 1;
    }
  }
  for (const count of seen) expect(count).toBe(1);
};

for (const walk of names) {
  test(`${walk} matches across worker splits`, () => {
    const samples = 4;
    const epochs = 1;
    const job = jobFor(walk, samples, epochs);
    const base = run(job, [whole(samples)]);
    for (const workers of [1, 2, 3, 8]) {
      const tasks = createTaskQueue(samples, workers);
      cover(tasks, samples);
      expectMatch(walk, base, run(job, tasks), epochs, samples);
      expectMatch(walk, base, run(job, tasks.toReversed()), epochs, samples);
    }
  });
}

test("adding samples leaves the earlier paths alone", () => {
  for (const walk of names) {
    const short = run(jobFor(walk, 2, 1), [whole(2)]);
    const long = run(jobFor(walk, 4, 1), [whole(4)]);
    expectMatch(walk, short, long, 1, 2);
    const prices = new GrowableSharedArray(1, 4, weeks);
    const states = new GrowableSharedArray(1, 4, WALK_STATE_LENGTH);
    const job = jobFor(walk, 4, 1);
    run(job, [{ arrayIndex: 0, endIndex: 2, startIndex: 0 }], { prices, states });
    run(job, [{ arrayIndex: 0, endIndex: 4, startIndex: 2 }], { prices, states });
    expectMatch(walk, long, { prices, states }, 1, 4);
  }
});

test("adding epochs leaves the earlier epochs alone", () => {
  for (const walk of ["Bubble", "Momentum", "Pong", "Shark"] as const) {
    const short = run(jobFor(walk, 2, 2), [whole(2)]);
    const long = run(jobFor(walk, 2, 4), [whole(2)]);
    expectMatch(walk, short, long, 2, 2);
    const prices = new GrowableSharedArray(4, 2, weeks);
    const states = new GrowableSharedArray(4, 2, WALK_STATE_LENGTH);
    run(jobFor(walk, 2, 2), [whole(2)], { prices, states });
    run(jobFor(walk, 2, 4), [whole(2, 2)], { prices, states });
    expectMatch(walk, long, { prices, states }, 4, 2);
  }
});

test("a path is unchanged by the path that ran before it", () => {
  for (const walk of ["Bubble", "Momentum", "Pong", "Shark"] as const) {
    const volatility = walk === "Pong" ? 0 : 0.1;
    const seed = walk === "Shark" ? 3 : 1;
    const settings = { seed, volatility };
    const alone = run(jobFor(walk, 1, 2, settings), [whole(1)]);
    const joint = run(jobFor(walk, 2, 2, settings), [whole(2)]);
    expectMatch(walk, alone, joint, 2, 1);
    const second = run(jobFor(walk, 2, 2, settings), [
      { arrayIndex: 0, endIndex: 2, startIndex: 1 },
    ]);
    expectMatch(walk, joint, second, 2, 1, 1);

    const prices = new GrowableSharedArray(2, 2, weeks);
    const states = new GrowableSharedArray(2, 2, WALK_STATE_LENGTH);
    const grids = { prices, states };
    // Epoch 0, then a different path, then this path's next epoch.
    run(jobFor(walk, 2, 1, settings), [{ arrayIndex: 0, endIndex: 1, startIndex: 0 }], grids);
    run(jobFor(walk, 2, 2, settings), [{ arrayIndex: 0, endIndex: 2, startIndex: 1 }], grids);
    run(jobFor(walk, 2, 2, settings), [whole(1, 1)], grids);
    expectMatch(walk, joint, grids, 2, 2);
  }
});

test("the same seed repeats and a new seed does not", () => {
  const once = run(jobFor("Bubble", 1, 1, { seed: 1 }), [whole(1)]);
  const twice = run(jobFor("Bubble", 1, 1, { seed: 1 }), [whole(1)]);
  const other = run(jobFor("Bubble", 1, 1, { seed: 2 }), [whole(1)]);
  expectMatch("Bubble", once, twice, 1, 1);
  const left = once.prices.get(0, 0);
  const right = other.prices.get(0, 0);
  if (left === undefined || right === undefined) throw new Error("Bubble epoch 0 sample 0 week 0");
  let differs = false;
  for (let week = 0; week < left.length; week++) {
    if (!Object.is(numberAt(left, week), numberAt(right, week))) differs = true;
  }
  expect(differs).toBe(true);
});

const tagsFor = (
  grids: Grids,
  sample: number,
  epochs: number,
): Array<{ side: "high" | "low"; week: number }> => {
  const tags: Array<{ side: "high" | "low"; week: number }> = [];
  let last = "";
  for (let epoch = 0; epoch < epochs; epoch++) {
    const row = grids.prices.get(epoch, sample);
    if (row === undefined) throw new Error(`Pong epoch ${epoch} sample ${sample} week 0`);
    for (let week = 0; week < row.length; week++) {
      const price = numberAt(row, week);
      if (Number.isNaN(price)) continue;
      const side = price >= maxPrice ? "high" : price <= minPrice ? "low" : "";
      if (side !== "" && side !== last) tags.push({ side, week: epoch * weeks + week });
      last = side;
    }
  }
  return tags;
};

test("Pong at zero volatility reaches the other wall about one epoch later", () => {
  const epochs = 4;
  const grids = run(jobFor("Pong", 1, epochs, { currentPrice: minPrice, volatility: 0 }), [
    whole(1),
  ]);
  const tags = tagsFor(grids, 0, epochs);
  const first = tags[0];
  const high = tags[1];
  const back = tags[2];
  if (first === undefined || high === undefined || back === undefined) {
    throw new Error("Pong epoch 0 sample 0 week 0");
  }
  expect(first.side).toBe("low");
  expect(first.week).toBe(0);
  expect(high.side).toBe("high");
  expect(high.week > 200).toBe(true);
  expect(high.week < 230).toBe(true);
  expect(back.side).toBe("low");
  const gap = back.week - high.week;
  expect(gap > 180).toBe(true);
  expect(gap < 250).toBe(true);
  for (let index = 1; index < tags.length; index++) {
    const previous = tags[index - 1];
    const current = tags[index];
    if (previous === undefined || current === undefined)
      throw new Error("Pong epoch 0 sample 0 week 0");
    expect(current.week - previous.week >= 30).toBe(true);
  }
});

test("edges stay repeatable for the stateful walks", () => {
  for (const walk of ["Momentum", "Pong", "Shark"] as const) {
    for (const weeksSince of [10, weeks]) {
      const job = jobFor(walk, 1, 2, {
        weeksSince,
        volatility: walk === "Pong" && weeksSince === weeks ? 0 : 0.1,
      });
      const once = run(job, [whole(1)]);
      const twice = run(job, [whole(1)]);
      expectMatch(walk, once, twice, 2, 1);
      const opening = once.prices.get(0, 0);
      if (opening === undefined) throw new Error(`${walk} epoch 0 sample 0 week 0`);
      if (weeksSince === weeks) {
        for (let week = 0; week < weeks; week++)
          expect(Number.isNaN(numberAt(opening, week))).toBe(true);
        expect(once.states.get(0, 0)).toBeUndefined();
        const next = once.prices.get(1, 0);
        const cycle = once.states.get(1, 0);
        if (next === undefined || cycle === undefined)
          throw new Error(`${walk} epoch 1 sample 0 week 0`);
        expect(Number.isNaN(numberAt(next, 0))).toBe(false);
        expect(numberAt(cycle, 2)).toBe(1);
      } else {
        for (let week = 0; week < weeksSince; week++)
          expect(Number.isNaN(numberAt(opening, week))).toBe(true);
        expect(Number.isNaN(numberAt(opening, weeksSince))).toBe(false);
        const cycle = once.states.get(0, 0);
        if (cycle === undefined) throw new Error(`${walk} epoch 0 sample 0 week 0`);
        expect(numberAt(cycle, 2)).toBe(1);
      }
    }
  }
});
