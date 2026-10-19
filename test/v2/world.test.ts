import { file } from "bun";
import { expect, test } from "bun:test";

import { createEngine } from "../../src/engine/engine";
import { DEFAULT_INFLATION, engineConfig, SIMULATION_SEED } from "../../src/v2/app/engine/config";
import { defaultModelsValues } from "../../src/v2/app/models/values";
import {
  bandRange,
  endValue,
  PRICE_QUANTILE_BAND,
  type PriceBands,
  priceBands,
} from "../../src/v2/app/world/bands";
import { inProcessWorker } from "../golden/in-process";
import {
  axisTicks,
  fitDomain,
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

const near = (a: number, b: number): boolean => Math.abs(a / b - 1) < 1e-9;

test("axis fit: the data's p5–p95 range plus 5% of its log span each side, not whole decades", () => {
  // $100k–$100M is a 3-decade span: 0.15 decades of margin each side.
  const d = fitDomain(1e5, 1e8);
  expect(near(d.lo, 10 ** 4.85) && near(d.hi, 10 ** 8.15)).toBe(true);
  // Argument order and the ≤0 guard do not matter.
  expect(fitDomain(1e8, 1e5)).toEqual(d);
  expect(fitDomain(-5, 1).lo > 0).toBe(true);
});

test("axis fit: a range narrower than ×2 widens to ×2 about its log centre, then the margin", () => {
  const d = fitDomain(59e6, 77.6e6);
  const centre = Math.sqrt(59e6 * 77.6e6);
  expect(near(d.lo * d.hi, centre * centre)).toBe(true);
  expect(near(Math.log10(d.hi / d.lo), Math.log10(2) * 1.1)).toBe(true);
  // A flat series gets the same ×2 window.
  const flat = fitDomain(1e6, 1e6);
  expect(near(Math.log10(flat.hi / flat.lo), Math.log10(2) * 1.1)).toBe(true);
});

test("gridlines only at the decades inside the fitted range: no empty $1B above, no $10k below", () => {
  // $150k–$60M: the margin reaches $110k–$81M, so $100k and $100M stay off.
  expect(axisTicks(fitDomain(1.5e5, 6e7))).toEqual([1e6, 1e7]);
  expect(axisTicks(fitDomain(64_000, 1.1e8))).toEqual([1e5, 1e6, 1e7, 1e8]);
  expect(axisTicks({ lo: 1e4, hi: 1e7 })).toEqual([1e4, 1e5, 1e6, 1e7]);
});

test("no decade inside: 1-2-5 steps, then whole multiples of the decade", () => {
  // $59M–$77.6M (Form's default-data example) contains no decade: ×2 window ≈ $46M–$99M → $50M.
  expect(axisTicks(fitDomain(59e6, 77.6e6))).toEqual([5e7]);
  // $22M–$45M: no decade and no 1-2-5 step → $30M and $40M.
  expect(axisTicks({ lo: 22e6, hi: 45e6 })).toEqual([3e7, 4e7]);
  // $1.1M–$4.9M: 1-2-5 gives $2M.
  expect(axisTicks({ lo: 1.1e6, hi: 4.9e6 })).toEqual([2e6]);
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

test("engine config: Models values map onto main's EngineConfig fields, price quantiles only", () => {
  const inputs = { currentBlock: 1, currentPrice: 2, halvings: {}, interim: [], now: NOW };
  const config = engineConfig({ ...defaultModelsValues(), epochCount: 7, walk: "Saw" }, inputs);
  expect(config?.epochs).toBe(7);
  expect(config?.scenario.walk).toBe("Saw");
  expect(config?.seed).toBe(SIMULATION_SEED);
  expect(config?.render.renderPriceDistribution).toBe("Quantile");
  expect(engineConfig({ ...defaultModelsValues(), model: "Nope" }, inputs)).toBe(null);
});

const band = (...v: number[]): Float64Array => Float64Array.from(v);
const withEdges = (p5: Float64Array, p95: Float64Array): PriceBands => ({
  start: 0,
  weeks: p5.length - 1,
  p5,
  p25: p5,
  p50: p5,
  p75: p95,
  p95,
});

test("bandRange skips Infinity and NaN, so the axis stays finite (Keel)", () => {
  const bands = withEdges(
    band(Number.NaN, 50_000, Number.NEGATIVE_INFINITY, 0),
    band(Number.POSITIVE_INFINITY, 2e6, Number.NaN),
  );
  expect(bandRange(bands)).toEqual({ low: 50_000, high: 2e6 });
  expect(axisTicks(fitDomain(50_000, 2e6))).toEqual([1e5, 1e6]);
});

test("bandRange with no finite values falls back to $1–$1", () => {
  const bands = withEdges(band(Number.NaN), band(Number.POSITIVE_INFINITY));
  expect(bandRange(bands)).toEqual({ low: 1, high: 1 });
});

test("priceBands reads a real engine snapshot (labels come from main's createDataSet)", async () => {
  const engine = createEngine({ worker: inProcessWorker() });
  const config = engineConfig(
    { ...defaultModelsValues(), samples: 20, epochCount: 1 },
    {
      currentBlock: 840_000,
      currentPrice: 64_000,
      halvings: {
        "210000": 1_354_116_278,
        "420000": 1_468_082_773,
        "630000": 1_589_225_023,
        "840000": 1_713_571_767,
      },
      interim: [],
      now: 1_760_000_000_000,
    },
  );
  if (config === null) throw new Error("default values are engine names");
  engine.set(config);
  expect(await engine.settled()).toBe("quiet");
  const bands = priceBands(engine.get().dataProperties?.datasets);
  engine.dispose();
  expect(bands === null).toBe(false);
  expect((bands?.p95[10] ?? 0) >= (bands?.p5[10] ?? 1)).toBe(true);
});

test("G12-style: DEFAULT_INFLATION re-reads main's drawdown default", async () => {
  const main = await file(`${import.meta.dir}/../../src/contexts/drawdown.tsx`).text();
  const found = /const \[inflation, setInflation\] = useState<number>\((\d+(?:\.\d+)?)\)/.exec(
    main,
  );
  expect(Number(found?.[1])).toBe(DEFAULT_INFLATION);
});

/** Drift between v2's PRICE_QUANTILE_BAND and main's bandConfig("price", "quantile") source. */
const bandDrift = (text: string): string[] => {
  const block =
    /character === "price"\) \{\s*return kind === "quantile"\s*\?\s*\{([\s\S]*?)\}\s*:/.exec(
      text,
    )?.[1] ?? "";
  const color = /color: \{ blue: (\d+), green: (\d+), red: (\d+) \}/.exec(block);
  const read = {
    color: { blue: Number(color?.[1]), green: Number(color?.[2]), red: Number(color?.[3]) },
    cutoffs: (/cutoffs: \[([^\]]*)\]/.exec(block)?.[1] ?? "").split(",").map(Number),
    midLabel: /midLabel: "([^"]*)"/.exec(block)?.[1],
    type: /type: "(\w+)"/.exec(block)?.[1],
    yAxisID: /yAxisID: "(\w+)"/.exec(block)?.[1],
  };
  const mine = { ...PRICE_QUANTILE_BAND, cutoffs: [...PRICE_QUANTILE_BAND.cutoffs] };
  return Object.entries(read)
    .filter(([key, value]) => {
      const want: unknown = Object.entries(mine).find(([k]) => k === key)?.[1];
      return JSON.stringify(value) !== JSON.stringify(want);
    })
    .map(([key]) => key);
};

test("G12-style: v2's price band mirrors main's bandConfig(price, quantile); seeded edits are red", async () => {
  const main = await file(`${import.meta.dir}/../../src/contexts/computed/distribution.ts`).text();
  expect(bandDrift(main)).toEqual([]);
  expect(bandDrift(main.replace("0.05, 0.25", "0.06, 0.25"))).toEqual(["cutoffs"]);
  expect(bandDrift(main.replace('midLabel: "Bitcoin Price"', 'midLabel: "BTC"'))).toEqual([
    "midLabel",
  ]);
  expect(bandDrift(main.replace("blue: 50,", "blue: 51,"))).toEqual(["color"]);
});
