import { file } from "bun";
import { expect, test } from "bun:test";

import { handleQuantile } from "../src/contexts/workers/quantile";
import { type SignalState } from "../src/contexts/workers/types";
import { type Task } from "../src/helpers";

const samples = 5;
const cutoffs = [0, 0.25, 0.5, 1];
const weeks = [
  [10, 30, 20, 50, 40],
  [5, 1, 4, 2, 3],
  [7, 7, 7, 4, 4],
];

const ranks = (values: readonly number[]): number[] => {
  const sorted = [...values].toSorted((left, right) => left - right);
  const last = values.length - 1;
  return cutoffs.map((cutoff) => {
    const value = sorted[Math.floor(last * cutoff)];
    if (value === undefined) throw new Error("missing rank");
    return value;
  });
};

const shared = (values: readonly number[]): SharedArrayBuffer => {
  const buffer = new SharedArrayBuffer(values.length * Float64Array.BYTES_PER_ELEMENT);
  new Float64Array(buffer).set(values);
  return buffer;
};

const task = (endIndex: number): Task => ({ arrayIndex: 0, endIndex, startIndex: 0 });

const running: SignalState = { aborted: false };

test("a known sample vector produces the order statistic at each cutoff", () => {
  const grouped = shared(weeks.flat());
  const quantiles = shared(Array.from({ length: weeks.length * cutoffs.length }, () => 0));

  handleQuantile(
    {
      cutoffs,
      groupedDataBuffer: grouped,
      quantilesBuffer: quantiles,
      samples,
      task: task(weeks.length),
    },
    running,
  );

  const result = [...new Float64Array(quantiles)];
  for (let week = 0; week < weeks.length; week++) {
    const prices = weeks[week];
    if (prices === undefined) throw new Error("missing week");
    expect(result.slice(week * cutoffs.length, (week + 1) * cutoffs.length)).toEqual(ranks(prices));
  }
});

test("one sample and two samples keep the cutoff endpoints", () => {
  const endpoints = [0, 1];

  const one = shared([42]);
  const oneResult = shared([0, 0]);
  handleQuantile(
    {
      cutoffs: endpoints,
      groupedDataBuffer: one,
      quantilesBuffer: oneResult,
      samples: 1,
      task: task(1),
    },
    running,
  );
  expect([...new Float64Array(oneResult)]).toEqual([42, 42]);

  const two = shared([3, 1]);
  const twoResult = shared([0, 0]);
  handleQuantile(
    {
      cutoffs: endpoints,
      groupedDataBuffer: two,
      quantilesBuffer: twoResult,
      samples: 2,
      task: task(1),
    },
    running,
  );
  expect([...new Float64Array(twoResult)]).toEqual([1, 3]);
});

test("a week that mixes NaN with numbers keeps the current order statistics", () => {
  const quantiles = shared([0, 0, 0, 0]);

  handleQuantile(
    {
      cutoffs,
      groupedDataBuffer: shared([Number.NaN, 1, Number.NaN, 4, 2]),
      quantilesBuffer: quantiles,
      samples,
      task: task(1),
    },
    running,
  );

  const result = [...new Float64Array(quantiles)];
  expect(result[0]).toBe(4);
  expect(result[1]).toBe(1);
  expect(result[2]).toBe(2);
  expect(Number.isNaN(result[3])).toBe(true);
});

test("an aborted quantile pass leaves the result buffer empty", () => {
  const quantiles = shared(Array.from({ length: cutoffs.length }, () => 0));

  handleQuantile(
    {
      cutoffs,
      groupedDataBuffer: shared(weeks[0] ?? []),
      quantilesBuffer: quantiles,
      samples,
      task: task(1),
    },
    { aborted: true },
  );

  expect([...new Float64Array(quantiles)]).toEqual([0, 0, 0, 0]);
});

// The price and drawdown quantile bands in the app, read from the source so the test follows them.
const appCutoffs = async (): Promise<number[]> => {
  const source = await file(`${import.meta.dir}/../src/contexts/computed/distribution.ts`).text();
  const lists = [...source.matchAll(/cutoffs: \[([^\]]*)\]/gu)]
    .map((match) => (match[1] ?? "").split(",").map(Number))
    .filter((list) => list.every((cutoff) => cutoff >= 0 && cutoff <= 1));
  const [first, ...rest] = lists;
  if (first === undefined || first.length < 2)
    throw new Error("no quantile cutoffs in distribution.ts");
  for (const list of rest) expect(list).toEqual(first);
  return first;
};

const sortedRanks = (values: readonly number[], at: readonly number[]): number[] => {
  const sorted = [...values].toSorted((left, right) => left - right);
  const last = values.length - 1;
  return at.map((cutoff) => {
    const value = sorted[Math.floor(last * cutoff)];
    if (value === undefined) throw new Error("missing rank");
    return value;
  });
};

const quantilesOf = (values: readonly number[], at: number[]): number[] => {
  const quantiles = shared(Array.from({ length: at.length }, () => 0));
  handleQuantile(
    {
      cutoffs: at,
      groupedDataBuffer: shared(values),
      quantilesBuffer: quantiles,
      samples: values.length,
      task: task(1),
    },
    running,
  );
  return [...new Float64Array(quantiles)];
};

// mulberry32: a fixed seed keeps every run on the same arrays.
const seeded = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

test("the app cutoffs match a full sort when two cutoffs share an index", async () => {
  const at = await appCutoffs();
  const random = seeded(40);
  for (const count of [1, 2, 20, 21, 40, 41, 100, 101]) {
    const values = Array.from({ length: count }, () => random() * 1000);
    expect({ count, quantiles: quantilesOf(values, at) }).toEqual({
      count,
      quantiles: sortedRanks(values, at),
    });
  }
});

test("random arrays of 1 to 1000 samples match a full sort at every app cutoff", async () => {
  const at = await appCutoffs();
  const random = seeded(20_261_019);
  for (let trial = 0; trial < 100; trial++) {
    const count = 1 + Math.floor(random() * 1000);
    // Odd trials use small integers, so tied values meet the cutoffs too.
    const values = Array.from({ length: count }, () =>
      trial % 2 === 0 ? random() * 1000 : Math.floor(random() * 50),
    );
    expect({ count, quantiles: quantilesOf(values, at), trial }).toEqual({
      count,
      quantiles: sortedRanks(values, at),
      trial,
    });
  }
});
