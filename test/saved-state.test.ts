import { expect, test } from "bun:test";

import { WEEKS_PER_EPOCH } from "../src/constants";
import { readSavedAppState, savedHorizon } from "../src/helpers";
import { legacySpan, resolveHorizon } from "../src/horizon";

const saved = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
  bitcoin: 1,
  clampBottom: false,
  clampTop: false,
  epochCount: 10,
  hideResults: false,
  inflation: 0,
  loadingPriceData: false,
  loadingVolumeData: false,
  minMaxMultiple: 3,
  model: "Power Law Regression Median",
  oneOffFiatVariables: [],
  oneOffItems: [],
  renderDrawdownDistribution: "Quantile",
  renderDrawdownWalks: false,
  renderModelMax: true,
  renderModelMin: true,
  renderPriceDistribution: "Quantile",
  renderPriceWalks: false,
  reoccurringItems: [],
  samples: 1,
  showDrawdown: true,
  showHistoric: true,
  showModel: false,
  showRender: true,
  showResults: true,
  variable: 0,
  version: 1,
  volatility: 0.1,
  walk: "Bubble",
  ...patch,
});

test("an epoch count outside 1 through 30 is rejected", () => {
  expect(() => readSavedAppState(saved({ epochCount: 31 }))).toThrow("saved state is not valid");
  expect(() => readSavedAppState(saved({ epochCount: 0 }))).toThrow("saved state is not valid");
  expect(() => readSavedAppState(saved({ epochCount: 1.5 }))).toThrow("saved state is not valid");
});

test("an epoch count with no years stays a legacy plan", () => {
  const state = readSavedAppState(saved());
  expect(state.epochCount).toBe(10);
  expect(state.years).toBeUndefined();
  expect(state.pinnedWeeks).toBeUndefined();
});

test("years with a valid epoch count is a year horizon", () => {
  const state = readSavedAppState(saved({ years: 40 }));
  expect(state.epochCount).toBe(10);
  expect(state.years).toBe(40);
});

test("a pinned one-week span reloads as one week after it allocates another column", () => {
  const weeksSince = WEEKS_PER_EPOCH;
  const pinned = legacySpan(1, weeksSince);
  const written = savedHorizon(weeksSince, 1, pinned);
  expect(written).toEqual({ epochCount: 2, pinnedWeeks: 1 });

  const state = readSavedAppState(saved(written));
  expect(state.years).toBeUndefined();
  expect(resolveHorizon(weeksSince, 1, state.pinnedWeeks ?? null).dataLength).toBe(1);
});

test("a year horizon omits the pin", () => {
  expect(savedHorizon(0, 40, null)).toEqual({ epochCount: 10, years: 40 });
});

test("a pinned week count outside 1 through 6240 is rejected", () => {
  expect(() => readSavedAppState(saved({ pinnedWeeks: 0 }))).toThrow("saved state is not valid");
  expect(() => readSavedAppState(saved({ pinnedWeeks: 6241 }))).toThrow("saved state is not valid");
  expect(() => readSavedAppState(saved({ pinnedWeeks: 1.5 }))).toThrow("saved state is not valid");
});

test("an old power-law name opens as Power Law, and the support name does not open", () => {
  expect(readSavedAppState(saved()).model).toBe("Power Law");
  expect(readSavedAppState(saved()).settings).toBeUndefined();
  expect(readSavedAppState(saved({ model: "Power Law" })).model).toBe("Power Law");
  expect(() => readSavedAppState(saved({ model: "Power Law Support Line" }))).toThrow(
    "saved state is not valid",
  );
});

test("a saved shift reloads, and a settings value that is not a number or a string is rejected", () => {
  const state = readSavedAppState(saved({ model: "Power Law", settings: { yearOffset: 7 } }));
  expect(state.model).toBe("Power Law");
  expect(state.settings).toEqual({ yearOffset: 7 });
  expect(() => readSavedAppState(saved({ settings: { yearOffset: true } }))).toThrow(
    "saved state is not valid",
  );
  expect(() => readSavedAppState(saved({ settings: ["yearOffset"] }))).toThrow(
    "saved state is not valid",
  );
});

test("years outside 1 through 120 are rejected", () => {
  expect(() => readSavedAppState(saved({ years: 0 }))).toThrow("saved state is not valid");
  expect(() => readSavedAppState(saved({ years: 121 }))).toThrow("saved state is not valid");
  expect(() => readSavedAppState(saved({ years: 40.5 }))).toThrow("saved state is not valid");
});
