import { file } from "bun";
import { expect, test } from "bun:test";

import { createEngine } from "../../src/engine/engine";
import {
  DEFAULT_INFLATION,
  engineConfig,
  inputsReady,
  SIMULATION_SEED,
} from "../../src/v2/app/engine/config";
import { defaultModelsValues } from "../../src/v2/app/models/values";
import { MS_PER_WEEK, MS_PER_YEAR, WEEKS_PER_EPOCH } from "../../src/constants";
import cagrModel from "../../src/data/models/cagr";
import {
  bandRange,
  endValue,
  outOfRange,
  PRICE_QUANTILE_BAND,
  type PriceBands,
  priceBands,
} from "../../src/v2/app/world/bands";
import { inProcessWorker } from "../golden/in-process";
import {
  axisTicks,
  coverTop,
  DEFAULT_DOMAIN,
  fitDomain,
  MAX_DECADE_PASSES,
  validDomain,
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

test("n11: the chart status caption sits in the plot: --plot-inset mirrors plotBox (T R B L)", async () => {
  const css = await file(`${import.meta.dir}/../../src/v2/design/tokens/space.css`).text();
  const inset = /--plot-inset:([^;]+);/.exec(css)?.[1]?.trim().split(/\s+/) ?? [];
  const px = inset.map((v) => Number.parseFloat(v) * 16);
  const plot = plotBox(400, 300);
  expect(px).toEqual([plot.T, 400 - plot.R, 300 - plot.Bt, plot.L]);
});

test("n10: thinned ticks count down from the top decade inside the domain; coverTop lifts the axis over the data", () => {
  const ticks = axisTicks({ lo: 1e4, hi: 3e300 });
  expect(ticks.at(-1)).toBe(1e300);
  expect(ticks.length <= MAX_DECADE_PASSES).toBe(true);
  expect(ticks).toEqual(ticks.toSorted((a, b) => a - b));
  // Fitted, $2,000T's axis tops out near $2,600T: the top decade inside ($1,000T) is under the data.
  expect(axisTicks(fitDomain(1e5, 2e15)).at(-1)).toBe(1e15);
  const covered = coverTop(fitDomain(1e5, 2e15), 2e15);
  expect(covered.hi).toBe(1e16);
  expect(axisTicks(covered).at(-1)).toBe(1e16);
  expect(coverTop({ lo: 1e4, hi: 1e7 }, 5e6)).toEqual({ lo: 1e4, hi: 1e7 });
  expect(coverTop({ lo: 1e4, hi: 1e7 }, Number.POSITIVE_INFINITY)).toEqual({ lo: 1e4, hi: 1e7 });
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
  series("Lowest Sampled Bitcoin Price", [80_000, 50_000, 200_000]),
  series("1st Percentile Bitcoin Price", [85_000, 60_000, 250_000]),
  series("5th Percentile Bitcoin Price", [90_000, 80_000, 400_000]),
  series("25th Percentile Bitcoin Price", [100_000, 120_000, 700_000]),
  series("Median Bitcoin Price", [110_000, 150_000, 1_200_000]),
  series("75th Percentile Bitcoin Price", [120_000, 190_000, 1_900_000]),
  series("95th Percentile Bitcoin Price", [130_000, 260_000, 3_100_000]),
  series("99th Percentile Bitcoin Price", [140_000, 330_000, 4_800_000]),
  series("Highest Sampled Bitcoin Price", [150_000, 400_000, 6_000_000]),
  series("Bitcoin Walk 1", [1, 2, 3]),
];

test("1L.4: price bands read all nine series, lowest to highest, from the engine's datasets", () => {
  const bands = priceBands(ENGINE);
  expect(bands?.weeks).toBe(2);
  expect(bands?.start).toBe(NOW);
  expect([...(bands?.p50 ?? [])]).toEqual([110_000, 150_000, 1_200_000]);
  expect([...(bands?.min ?? [])]).toEqual([80_000, 50_000, 200_000]);
  expect([...(bands?.p1 ?? [])]).toEqual([85_000, 60_000, 250_000]);
  expect([...(bands?.p99 ?? [])]).toEqual([140_000, 330_000, 4_800_000]);
  expect([...(bands?.max ?? [])]).toEqual([150_000, 400_000, 6_000_000]);
});

test("no bands until every percentile is present; without min/max the edge is p1–p99", () => {
  expect(priceBands(undefined)).toBe(null);
  expect(priceBands(ENGINE.filter((d) => !d.label.startsWith("1st")))).toBe(null);
  expect(priceBands(ENGINE.filter((d) => !d.label.startsWith("99th")))).toBe(null);
  const bare = priceBands(ENGINE.filter((d) => !/^(Lowest|Highest)/.test(d.label)));
  expect([...(bare?.min ?? [])]).toEqual([...(bare?.p1 ?? [])]);
  expect([...(bare?.max ?? [])]).toEqual([...(bare?.p99 ?? [])]);
});

test("1L.4: band range spans the lowest min to the highest max; end value is the horizon's last point", () => {
  const bands = priceBands(ENGINE);
  if (bands === null) throw new Error("bands");
  expect(bandRange(bands)).toEqual({ low: 50_000, high: 6_000_000 });
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
  min: p5,
  max: p95,
  p1: p5,
  p5,
  p25: p5,
  p50: p5,
  p75: p95,
  p95,
  p99: p95,
});

test("bandRange skips Infinity and NaN, so the axis stays finite (Keel)", () => {
  const bands = withEdges(
    band(Number.NaN, 50_000, Number.NEGATIVE_INFINITY, 0),
    band(Number.POSITIVE_INFINITY, 2e6, Number.NaN),
  );
  expect(bandRange(bands)).toEqual({ low: 50_000, high: 2e6 });
  expect(outOfRange(bands)).toBe(true); // p95 ends on NaN: no honest end value
  expect(axisTicks(fitDomain(50_000, 2e6))).toEqual([1e5, 1e6]);
});

test("B2: all-Infinity (or NaN) bands leave nothing to fit: no range, out of range", () => {
  const inf = withEdges(band(Number.POSITIVE_INFINITY), band(Number.POSITIVE_INFINITY));
  expect(bandRange(inf)).toBe(null);
  expect(outOfRange(inf)).toBe(true);
  expect(outOfRange(withEdges(band(Number.NaN), band(Number.NaN)))).toBe(true);
  expect(outOfRange(withEdges(band(50_000, 60_000), band(2e6, 3e6)))).toBe(false);
});

test("B2: huge, degenerate and non-finite bounds fit a finite domain; ticks are capped", () => {
  for (const [low, high] of [
    [1, 1e300],
    [1, Number.MAX_VALUE],
    [1e-300, 1e300],
    [Number.MIN_VALUE, Number.MAX_VALUE],
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [1e308, 1e308],
    [0, 0],
    [-5, 1e6],
    [Number.NaN, 1e6],
    [1e6, Number.POSITIVE_INFINITY],
    [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [Number.NaN, Number.NaN],
  ] as const) {
    const domain = fitDomain(low, high);
    expect({ low, high, valid: validDomain(domain) }).toEqual({ low, high, valid: true });
    const ticks = axisTicks(domain);
    expect(ticks.length > 0 && ticks.length <= MAX_DECADE_PASSES).toBe(true);
    expect(ticks.every((v) => Number.isFinite(v) && v >= domain.lo * 0.999)).toBe(true);
  }
  expect(axisTicks({ lo: Number.NaN, hi: 1 })).toEqual([]);
  expect(axisTicks({ lo: 1, hi: Number.POSITIVE_INFINITY })).toEqual([]);
  expect(axisTicks({ lo: 5, hi: 5 })).toEqual([]);
  expect(fitDomain(Number.NaN, Number.NaN)).toEqual({ lo: 0.01, hi: 10 ** (-2 + Math.log10(2)) });
  expect(validDomain(DEFAULT_DOMAIN)).toBe(true);
});

/**
 * The CAGR band the engine draws for R and epochs (main's own cagrModel min/max price per week),
 * with the engine's overflow tail: once a week overflows, it and every later week are NaN (what
 * the real engine returned for these inputs: e.g. 1e6 at 30 epochs, 3950 of 6110 weeks finite).
 */
const cagrBands = (variable: number, epochs: number): PriceBands => {
  const weeks = epochs * WEEKS_PER_EPOCH;
  const { minMaxMultiple } = defaultModelsValues();
  // main's cagrModel is memoised per week (slow for 6,000 weeks in a ~1 s suite): its formula is
  // applied here and checked against the model itself on sampled weeks.
  const growth = 1 + variable / 100;
  const at = (pick: "minPrice" | "maxPrice"): Float64Array => {
    const start = pick === "minPrice" ? 64_000 / minMaxMultiple : 64_000 * minMaxMultiple;
    const out = new Float64Array(weeks + 1);
    let broken = false;
    for (let week = 0; week <= weeks; week++) {
      const v = start * growth ** ((week * MS_PER_WEEK) / MS_PER_YEAR);
      if (week % 997 === 0) {
        const model = cagrModel[pick]({
          currentBlock: 0,
          currentPrice: 64_000,
          minMaxMultiple,
          now: 0,
          variable,
          week,
        });
        if (!Object.is(model, v)) throw new Error(`cagr formula drifted at week ${week}`);
      }
      broken ||= !Number.isFinite(v);
      out[week] = broken ? Number.NaN : v;
    }
    return out;
  };
  const p5 = at("minPrice");
  const p95 = at("maxPrice");
  const p50 = p5.map((v, i) => Math.sqrt(v * (p95[i] ?? Number.NaN)));
  return { start: 0, weeks, min: p5, max: p95, p1: p5, p5, p25: p5, p50, p75: p95, p95, p99: p95 };
};

test("B2: CAGR R 1e6 and 1e9 at 30 epochs, 1e300 at 10: out of range, finite axis, fast", () => {
  for (const [variable, epochs] of [
    [1e6, 30],
    [1e9, 30],
    [1e300, 10],
  ] as const) {
    const started = performance.now();
    const bands = cagrBands(variable, epochs);
    expect({ variable, out: outOfRange(bands) }).toEqual({ variable, out: true });
    const range = bandRange(bands);
    const domain = range === null ? DEFAULT_DOMAIN : fitDomain(range.low, range.high);
    expect(validDomain(domain)).toBe(true);
    expect(axisTicks(domain).length <= MAX_DECADE_PASSES).toBe(true);
    expect(performance.now() - started < 100).toBe(true);
  }
  // A large rate that stays finite still draws: 1e4 % over 10 epochs ends near $1e79.
  const big = cagrBands(1e4, 10);
  expect(outOfRange(big)).toBe(false);
  const range = bandRange(big);
  expect(validDomain(fitDomain(range?.low ?? 0, range?.high ?? 0))).toBe(true);
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

test("the first engine submit waits for a finite, non-zero price and block height", () => {
  const ready = { currentPrice: 64_000, currentBlock: 840_000 };
  expect(inputsReady(ready)).toBe(true);
  for (const held of [
    { currentPrice: 0, currentBlock: 0 }, // cold load: nothing fetched yet
    { currentPrice: 64_000, currentBlock: 0 }, // price landed, block height not yet
    { currentPrice: 0, currentBlock: 840_000 },
    { currentPrice: Number.NaN, currentBlock: 840_000 },
    { currentPrice: Number.POSITIVE_INFINITY, currentBlock: 840_000 },
    { currentPrice: 64_000, currentBlock: Number.NaN },
    { currentPrice: -1, currentBlock: 840_000 },
  ]) {
    expect({ ...held, ready: inputsReady(held) }).toEqual({ ...held, ready: false });
  }
});

test("§1L.4 sd: ±3σ / ±2σ / ±1σ fill the inner bands, the mean the median; min–max stays outermost", () => {
  const sd = [
    series("3rd Standard Deviation Bitcoin Price", [70_000, 40_000, 150_000]),
    series("2nd Standard Deviation Bitcoin Price", [90_000, 80_000, 400_000]),
    series("1st Standard Deviation Bitcoin Price", [100_000, 120_000, 700_000]),
    series("Mean Bitcoin Price", [110_000, 150_000, 1_200_000]),
    series("1st Standard Deviation Bitcoin Price", [120_000, 190_000, 1_900_000]),
    series("2nd Standard Deviation Bitcoin Price", [130_000, 260_000, 3_100_000]),
    series("3rd Standard Deviation Bitcoin Price", [150_000, 400_000, 6_000_000]),
  ];
  const bands = priceBands(sd);
  if (bands === null) throw new Error("bands");
  const at = (k: keyof PriceBands): number[] => {
    const v = bands[k];
    return typeof v === "number" ? [v] : [...v];
  };
  expect(at("p1")).toEqual([70_000, 40_000, 150_000]);
  expect(at("p5")).toEqual([90_000, 80_000, 400_000]);
  expect(at("p25")).toEqual([100_000, 120_000, 700_000]);
  expect(at("p50")).toEqual([110_000, 150_000, 1_200_000]);
  expect(at("p75")).toEqual([120_000, 190_000, 1_900_000]);
  expect(at("p95")).toEqual([130_000, 260_000, 3_100_000]);
  expect(at("p99")).toEqual([150_000, 400_000, 6_000_000]);
  // No engine min / max for sd: the outermost edge is ±3σ, never inside it.
  expect(at("min")).toEqual(at("p1"));
  expect(at("max")).toEqual(at("p99"));
  // With min / max datasets present they become the edge, the σ bands untouched inside.
  const edged = priceBands([
    series("Lowest Sampled Bitcoin Price", [60_000, 30_000, 100_000]),
    ...sd,
    series("Highest Sampled Bitcoin Price", [160_000, 500_000, 7_000_000]),
  ]);
  expect([...(edged?.min ?? [])]).toEqual([60_000, 30_000, 100_000]);
  expect([...(edged?.max ?? [])]).toEqual([160_000, 500_000, 7_000_000]);
  expect([...(edged?.p1 ?? [])]).toEqual(at("p1"));
});
