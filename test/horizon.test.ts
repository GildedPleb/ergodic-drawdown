import { expect, test } from "bun:test";

import {
  allocatedEpochs,
  coveredEpochs,
  legacySpan,
  maxYears,
  resolveHorizon,
  visibleWeeks,
} from "../src/horizon";

test("forty years is 2080 weeks and ten epochs from a halving", () => {
  expect(visibleWeeks(40)).toBe(2080);
  expect(resolveHorizon(0, 40, null)).toEqual({ dataLength: 2080, epochs: 10 });
  expect(coveredEpochs(0, 2080)).toBe(10);
});

test("forty years from week 130 allocates the partial eleventh epoch", () => {
  expect(resolveHorizon(130, 40, null)).toEqual({ dataLength: 2080, epochs: 11 });
  expect(coveredEpochs(130, 2080)).toBe(10);
});

test("one year fits in the open epoch", () => {
  expect(resolveHorizon(130, 1, null)).toEqual({ dataLength: 52, epochs: 1 });
  expect(resolveHorizon(207, 1, null)).toEqual({ dataLength: 52, epochs: 2 });
});

test("120 years fills the grid at a halving and clamps later", () => {
  expect(maxYears(0)).toBe(120);
  expect(resolveHorizon(0, 120, null)).toEqual({ dataLength: 6240, epochs: 30 });
  expect(maxYears(130)).toBe(117);
  expect(resolveHorizon(130, 120, null)).toEqual({ dataLength: 6110, epochs: 30 });
});

test("a saved ten-epoch span keeps its weeks", () => {
  const span = legacySpan(10, 130);
  expect(span).toBe(1950);
  expect(allocatedEpochs(130, span)).toBe(10);
  expect(resolveHorizon(130, 37, span)).toEqual({ dataLength: 1950, epochs: 10 });
});

test("a saved epoch that time has eaten keeps one week and grows a column", () => {
  const span = legacySpan(1, 208);
  expect(span).toBe(1);
  expect(resolveHorizon(208, 1, span)).toEqual({ dataLength: 1, epochs: 2 });
});
