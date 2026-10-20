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

// The min-max envelope: the drawn edge is the lowest and the highest walk. Walk i is the same at
// every sample count (each walk has its own stream, as the engine's do), so n samples are the first
// n walks. 1000 log-price walks of 208 weeks from $64,000.
const most = 1000;
const horizon = 208;
const walks = Array.from({ length: most }, (_, sample) => {
  const random = seeded(sample + 1);
  const walk = new Float64Array(horizon);
  let price = 64_000;
  for (let week = 0; week < horizon; week++) {
    price *= Math.exp((random() - 0.5) * 0.2);
    walk[week] = price;
  }
  return walk;
});

// The worker's pass over the first n walks at the given weeks, laid out week-major as group.ts does.
const walkBands = (n: number, at: number[], weeksAt: readonly number[]): Float64Array => {
  const grouped = weeksAt.flatMap((week) => walks.slice(0, n).map((walk) => walk[week] ?? 0));
  const quantiles = shared(Array.from({ length: weeksAt.length * at.length }, () => 0));
  handleQuantile(
    {
      cutoffs: at,
      groupedDataBuffer: shared(grouped),
      quantilesBuffer: quantiles,
      samples: n,
      task: task(weeksAt.length),
    },
    running,
  );
  return new Float64Array(quantiles);
};

test("from 1000 walks down to 1 the envelope never widens and every value is a walk's own price", async () => {
  const at = await appCutoffs();
  const high = at.length - 1;
  // The last week, where the walks are furthest apart. Sample i sits at index i, so one buffer
  // holds every prefix: handleQuantile reads the first n by its sample count.
  const week = horizon - 1;
  const prices = shared(walks.map((walk) => walk[week] ?? 0));
  const result = shared(at.map(() => 0));
  const prefix = (n: number): number[] => {
    handleQuantile(
      {
        cutoffs: at,
        groupedDataBuffer: prices,
        quantilesBuffer: result,
        samples: n,
        task: task(1),
      },
      running,
    );
    return [...new Float64Array(result)];
  };
  // The first walk to reach each price (it belongs to the first n walks when it came before n), and
  // the lowest and highest of the first n walks, for every n.
  const firstWalk = new Map<number, number>();
  const lowest = [Number.POSITIVE_INFINITY];
  const highest = [Number.NEGATIVE_INFINITY];
  for (const [sample, walk] of walks.entries()) {
    const price = walk[week] ?? Number.NaN;
    if (!firstWalk.has(price)) firstWalk.set(price, sample);
    lowest.push(Math.min(lowest.at(-1) ?? price, price));
    highest.push(Math.max(highest.at(-1) ?? price, price));
  }
  const faults: string[] = [];
  let before = prefix(most);
  for (let n = most - 1; n >= 1; n--) {
    const after = prefix(n);
    if ((after[0] ?? 0) < (before[0] ?? 0)) faults.push(`${n + 1}->${n} low widened`);
    if ((after[high] ?? 0) > (before[high] ?? 0)) faults.push(`${n + 1}->${n} high widened`);
    if (after[0] !== lowest[n] || after[high] !== highest[n]) faults.push(`n ${n} edge`);
    for (const value of after) {
      const owner = firstWalk.get(value);
      if (owner === undefined || owner >= n) faults.push(`n ${n} ${value} is no walk's price`);
    }
    before = after;
  }
  expect(faults).toEqual([]);
});

test("one sample is one path and two samples put both walks on the edges", async () => {
  const at = await appCutoffs();
  const high = at.length - 1;
  const every = Array.from({ length: horizon }, (_, week) => week);
  const one = walkBands(1, at, every);
  const two = walkBands(2, at, every);
  const [first, second] = walks;
  if (first === undefined || second === undefined) throw new Error("missing walks");
  for (const week of every) {
    const a = first[week] ?? Number.NaN;
    const b = second[week] ?? Number.NaN;
    const row = (bands: Float64Array): number[] => [
      ...bands.subarray(week * at.length, (week + 1) * at.length),
    ];
    expect(row(one)).toEqual(at.map(() => a));
    expect(row(two)[0]).toBe(Math.min(a, b));
    expect(row(two)[high]).toBe(Math.max(a, b));
    expect(a === b).toBe(false);
  }
});

test("501 to 500: the 1st percentile steps outward and the envelope does not", async () => {
  const at = await appCutoffs();
  const high = at.length - 1;
  const p1 = at.indexOf(0.01);
  // Every eighth week across the horizon.
  const every = Array.from({ length: horizon / 8 }, (_, step) => step * 8 + 7);
  const before = walkBands(501, at, every);
  const after = walkBands(500, at, every);
  const cell = (bands: Float64Array, slot: number, cutoff: number): number =>
    bands[slot * at.length + cutoff] ?? Number.NaN;
  let p1Out = 0;
  for (const slot of every.keys()) {
    expect(cell(after, slot, 0) >= cell(before, slot, 0)).toBe(true);
    expect(cell(after, slot, high) <= cell(before, slot, high)).toBe(true);
    if (cell(after, slot, p1) < cell(before, slot, p1)) p1Out++;
  }
  // floor(499 * 0.01) = 4 < floor(500 * 0.01) = 5: the p1 line hops one walk further out.
  expect(p1Out > every.length / 2).toBe(true);
});
