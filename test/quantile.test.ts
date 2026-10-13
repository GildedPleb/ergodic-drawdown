import { expect, test } from "bun:test";

import { handleQuantile } from "../src/contexts/workers/quantile";
import { type SignalState } from "../src/contexts/workers/types";
import { type Task } from "../src/helpers";

const samples = 5;
const cutoffs = [0, 0.25, 0.5, 1];
const weeks = [
  [10, 30, 20, 50, 40],
  [5, 1, 4, 2, 3],
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
  expect(result.slice(0, cutoffs.length)).toEqual(ranks(weeks[0] ?? []));
  expect(result.slice(cutoffs.length)).toEqual(ranks(weeks[1] ?? []));
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
