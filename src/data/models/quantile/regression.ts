import memoize from "memoizee";

import { MS_PER_DAY } from "../../../constants";
import { numberAt } from "../../../number-at";
import marketData from "../../datasets/bitcoin_weekly_prices_transformed_2.json";

const genesis = 1_230_940_800_000;
const slopeLow = 1;
const slopeHigh = 12;
const slopeSteps = 40;
const goldenRatio = (Math.sqrt(5) - 1) / 2;

interface PowerLine {
  exponent: number;
  intercept: number;
}

export interface LogFit {
  count: number;
  dayCount: (unixTimeMs: number) => number;
  days: Float64Array;
  fitPower: (level: number) => PowerLine;
  interceptAt: (exponent: number, level: number) => number;
  logDays: Float64Array;
  logPrice: Float64Array;
  price: (unixTimeMs: number, line: PowerLine) => number;
}

export const checkLoss = (gap: number, level: number): number =>
  gap < 0 ? gap * (level - 1) : gap * level;

export const golden = (
  loss: (value: number) => number,
  low: number,
  high: number,
  steps: number,
): number => {
  let lo = low;
  let hi = high;
  let left = hi - goldenRatio * (hi - lo);
  let right = lo + goldenRatio * (hi - lo);
  let leftLoss = loss(left);
  let rightLoss = loss(right);
  for (let step = 0; step < steps; step++) {
    if (leftLoss < rightLoss) {
      hi = right;
      right = left;
      rightLoss = leftLoss;
      left = hi - goldenRatio * (hi - lo);
      leftLoss = loss(left);
    } else {
      lo = left;
      left = right;
      leftLoss = rightLoss;
      right = lo + goldenRatio * (hi - lo);
      rightLoss = loss(right);
    }
  }
  return (lo + hi) / 2;
};

const compareNumber = (left: number, right: number): number =>
  left < right ? -1 : left > right ? 1 : 0;

const swap = (items: Float64Array, left: number, right: number): void => {
  const leftValue = numberAt(items, left);
  const rightValue = numberAt(items, right);
  items[left] = rightValue;
  items[right] = leftValue;
};

// Floyd-Rivest. The 600 cutoff is the published quickselect split.
const selectK = (items: Float64Array, k: number, left: number, right: number): void => {
  while (right > left) {
    if (right - left > 600) {
      const span = right - left + 1;
      const rank = k - left + 1;
      const logCount = Math.log(span);
      const sample = 0.5 * Math.exp((2 * logCount) / 3);
      const sd =
        0.5 *
        Math.sqrt((logCount * sample * (span - sample)) / span) *
        (rank - span / 2 < 0 ? -1 : 1);
      selectK(
        items,
        k,
        Math.max(left, Math.floor(k - (rank * sample) / span + sd)),
        Math.min(right, Math.floor(k + ((span - rank) * sample) / span + sd)),
      );
    }

    const pivot = numberAt(items, k);
    let i = left;
    let j = right;
    swap(items, left, k);
    if (compareNumber(numberAt(items, right), pivot) > 0) swap(items, left, right);

    while (i < j) {
      swap(items, i, j);
      i += 1;
      j -= 1;
      while (compareNumber(numberAt(items, i), pivot) < 0) i += 1;
      while (compareNumber(numberAt(items, j), pivot) > 0) j -= 1;
    }

    if (compareNumber(numberAt(items, left), pivot) === 0) swap(items, left, j);
    else {
      j += 1;
      swap(items, j, right);
    }

    if (j <= k) left = j + 1;
    if (k <= j) right = j - 1;
  }
};

const createFit = (dayCount: (unixTimeMs: number) => number): LogFit => {
  const count = marketData.length;
  const days = new Float64Array(count);
  const logDays = new Float64Array(count);
  const logPrice = new Float64Array(count);
  const scratch = new Float64Array(count);
  for (const [index, point] of marketData.entries()) {
    const elapsed = dayCount(point.x);
    days[index] = elapsed;
    logDays[index] = Math.log(elapsed);
    logPrice[index] = Math.log(point.y);
  }

  const orderIndex = (level: number): number => Math.ceil(level * count) - 1;

  const interceptAt = (exponent: number, level: number): number => {
    for (let index = 0; index < count; index++) {
      scratch[index] = numberAt(logPrice, index) - exponent * numberAt(logDays, index);
    }
    const index = orderIndex(level);
    selectK(scratch, index, 0, count - 1);
    return numberAt(scratch, index);
  };

  const slopeLoss = (exponent: number, level: number): number => {
    const intercept = interceptAt(exponent, level);
    let loss = 0;
    for (let index = 0; index < count; index++) {
      const gap = numberAt(logPrice, index) - intercept - exponent * numberAt(logDays, index);
      loss += checkLoss(gap, level);
    }
    return loss;
  };

  const fitPower = memoize((level: number): PowerLine => {
    const exponent = golden((value) => slopeLoss(value, level), slopeLow, slopeHigh, slopeSteps);
    return { exponent, intercept: interceptAt(exponent, level) };
  });

  const price = (unixTimeMs: number, line: PowerLine): number => {
    const elapsed = dayCount(unixTimeMs);
    return Math.exp(line.intercept + line.exponent * Math.log(elapsed));
  };

  return { count, dayCount, days, fitPower, interceptAt, logDays, logPrice, price };
};

/** Days since 2009-01-03. The genesis instant is day 0. */
export const sinceGenesis = createFit((unixTimeMs) => (unixTimeMs - genesis) / MS_PER_DAY);

/** Santostasi's log10 clock. The genesis day counts as day 1. */
export const genesisDayOne = createFit((unixTimeMs) => (unixTimeMs - genesis) / MS_PER_DAY + 1);
