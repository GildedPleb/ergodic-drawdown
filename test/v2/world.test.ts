import { expect, test } from "bun:test";

import { bandRange, endValue, priceBands } from "../../src/v2/app/world/bands";
import {
  decadeDomain,
  decades,
  endYear,
  lx,
  ly,
  monthYear,
  plotBox,
  yearTicks,
} from "../../src/v2/app/world/geometry";

const box = plotBox(390, 693);
const NOW = new Date(2026, 9, 19).getTime();
const WEEK = 7 * 24 * 60 * 60 * 1000;

test("plot box is the v32 frame: L34, R=W−44, T18, Bt=H−34", () => {
  expect(box).toEqual({ L: 34, R: 346, T: 18, Bt: 659 });
});

test("log domain rounds p5–p95 out to whole decades, at least one tall", () => {
  expect(decadeDomain(41_000, 3_100_000)).toEqual({ lo: 10_000, hi: 10_000_000 });
  expect(decadeDomain(100_000, 100_000)).toEqual({ lo: 100_000, hi: 1_000_000 });
});

test("one gridline per decade, ends included", () => {
  expect(decades({ lo: 10_000, hi: 10_000_000 })).toEqual([1e4, 1e5, 1e6, 1e7]);
});

test("ly maps lo to Bt and hi to T; lx maps today to L and the horizon to R", () => {
  const d = { lo: 1e4, hi: 1e7 };
  expect([ly(1e4, box, d), ly(1e7, box, d)]).toEqual([box.Bt, box.T]);
  expect([lx(0, box, 520), lx(520, box, 520)]).toEqual([box.L, box.R]);
});

test("year ticks sit at least 48px apart, thinned to every 2, 5 or 10 years", () => {
  const ticks = yearTicks(NOW, 2080, box);
  const gaps = ticks.slice(1).map((t, i) => t.x - (ticks[i]?.x ?? 0));
  expect(Math.min(...gaps) >= 48).toBe(true);
  expect(ticks.every((t) => t.year % 10 === 0)).toBe(true);
  expect(yearTicks(NOW, 2080, plotBox(1392, 717)).every((t) => t.year % 2 === 0)).toBe(true);
});

test("Today label month and the time bar's end year", () => {
  expect(monthYear(NOW)).toBe("Oct \u201926");
  expect(endYear(NOW, 2080)).toBe(2066);
});

const series = (label: string, ys: number[]): { label: string; data: unknown[] } => ({
  label,
  data: ys.map((y, i) => ({ x: NOW + i * WEEK, y })),
});
const ENGINE = [
  series("5th Percentile Bitcoin Price", [90_000, 80_000, 400_000]),
  series("25th Percentile Bitcoin Price", [100_000, 120_000, 700_000]),
  series("Median Bitcoin Price", [110_000, 150_000, 1_200_000]),
  series("75th Percentile Bitcoin Price", [120_000, 190_000, 1_900_000]),
  series("95th Percentile Bitcoin Price", [130_000, 260_000, 3_100_000]),
  series("Bitcoin Walk 1", [1, 2, 3]),
];

test("price bands read p5/p25/p50/p75/p95 from the engine's quantile datasets", () => {
  const bands = priceBands(ENGINE);
  expect(bands?.weeks).toBe(2);
  expect(bands?.start).toBe(NOW);
  expect([...(bands?.p50 ?? [])]).toEqual([110_000, 150_000, 1_200_000]);
});

test("no bands until every quantile is present", () => {
  expect(priceBands(undefined)).toBe(null);
  expect(priceBands(ENGINE.slice(1))).toBe(null);
});

test("band range spans min p5 to max p95; end value is the horizon's last point", () => {
  const bands = priceBands(ENGINE);
  if (bands === null) throw new Error("bands");
  expect(bandRange(bands)).toEqual({ low: 80_000, high: 3_100_000 });
  expect(endValue(bands.p95)).toBe(3_100_000);
});

test("engine config: Models values map onto main's EngineConfig fields, price quantiles only", async () => {
  const { engineConfig, SIMULATION_SEED } = await import("../../src/v2/app/engine/config");
  const { defaultModelsValues } = await import("../../src/v2/app/models/values");
  const inputs = { currentBlock: 1, currentPrice: 2, halvings: {}, interim: [], now: NOW };
  const config = engineConfig({ ...defaultModelsValues(), epochCount: 7, walk: "Saw" }, inputs);
  expect(config?.epochs).toBe(7);
  expect(config?.scenario.walk).toBe("Saw");
  expect(config?.seed).toBe(SIMULATION_SEED);
  expect(config?.render.renderPriceDistribution).toBe("Quantile");
  expect(engineConfig({ ...defaultModelsValues(), model: "Nope" }, inputs)).toBe(null);
});
