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

test("a second pass at the same sample count does not allocate a list", () => {
  const width = 64;
  const values = Array.from({ length: width }, (_, index) => index);
  const grouped = shared(values);
  const quantiles = shared([0, 0]);
  const payload = {
    cutoffs: [0, 1],
    groupedDataBuffer: grouped,
    quantilesBuffer: quantiles,
    samples: width,
    task: task(1),
  };

  const nativeFrom = Array.from;
  const nativeArray = globalThis.Array;
  let fromCalls = 0;
  let constructed = 0;
  function CountingArray(...args: number[]): unknown {
    constructed += 1;
    return Reflect.construct(nativeArray, args, nativeArray);
  }

  Object.defineProperty(globalThis, "Array", {
    configurable: true,
    value: CountingArray,
    writable: true,
  });
  Object.defineProperty(Array, "from", {
    configurable: true,
    value: (items: ArrayLike<number>) => {
      fromCalls += 1;
      return nativeFrom(items);
    },
    writable: true,
  });

  try {
    handleQuantile(payload, running);
    expect(constructed).toBe(0);
    expect(fromCalls).toBe(0);
    constructed = 0;
    handleQuantile(payload, running);
  } finally {
    Object.defineProperty(globalThis, "Array", {
      configurable: true,
      value: nativeArray,
      writable: true,
    });
    Object.defineProperty(Array, "from", {
      configurable: true,
      value: nativeFrom,
      writable: true,
    });
  }

  expect(fromCalls).toBe(0);
  expect(constructed).toBe(0);
  expect([...new Float64Array(quantiles)]).toEqual([0, 63]);
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
