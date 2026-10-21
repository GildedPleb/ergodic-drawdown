import hashSum from "hash-sum";

import GrowableSharedArray from "../../src/classes/growable-shared-array";
import VariableDrawdownCache from "../../src/classes/variable-drawdown-cache";
import { VariableDrawdownFinal } from "../../src/classes/variable-drawdown-final";
import { MS_PER_WEEK, MS_PER_YEAR, WEEKS_PER_EPOCH, WEEKS_PER_YEAR } from "../../src/constants";
import { handleChartOptions } from "../../src/contexts/computed/chart-options";
import { handleEnsureNotZero } from "../../src/contexts/computed/current";
import { handleDataProperties } from "../../src/contexts/computed/data-properties";
import { handleDistribution } from "../../src/contexts/computed/distribution";
import { handleDrawdownStatic } from "../../src/contexts/computed/drawdown-static";
import { handleDrawdownVariables } from "../../src/contexts/computed/drawdown-variable";
import { handleDrawdownVariableLabels } from "../../src/contexts/computed/drawdown-variable-labels";
import { handleDrawdownWalkDataset } from "../../src/contexts/computed/drawdown-walks";
import { handleHalvingAnnotations } from "../../src/contexts/computed/halving-annotations";
import { handleInflationFactors } from "../../src/contexts/computed/inflation-factors";
import { handleInterimDataset } from "../../src/contexts/computed/interim";
import { handleMaxArray } from "../../src/contexts/computed/max-array";
import { handleMaxModel } from "../../src/contexts/computed/max-dataset";
import { handleMinArray } from "../../src/contexts/computed/min-array";
import { handleMinModel } from "../../src/contexts/computed/min-dataset";
import { handlePriceWalkDataset } from "../../src/contexts/computed/price-walks";
import { handleSimulation } from "../../src/contexts/computed/simulation";
import { handleSimulationStats } from "../../src/contexts/computed/simulation-statistics";
import { handleVolume } from "../../src/contexts/computed/volume";
import { calculateVolumeStatistics } from "../../src/contexts/computed/volume-statistics";
import { calculateBalanceAndZero } from "../../src/contexts/computed/zero-count";
import { simulationSeed } from "../../src/contexts/model";
import { drawdownBandIdentity, walkedPriceIdentity } from "../../src/engine/keys";
import { type WalkTypes } from "../../src/data/walks";
import { WALK_STATE_LENGTH } from "../../src/data/walks/prng";
import { loadHalvings, weeksSinceLastHalving } from "../../src/halvings";
import {
  type DatasetList,
  type Full,
  type ModelNames,
  type NarrowedOneOffFiat,
  type OneOffFiatVariable,
  type OneOffItem,
  type ReoccurringItem,
} from "../../src/types";
import { installFrozenClock } from "../freeze-clock";
import { type CaseInput } from "./cases";
import { inProcessWorker } from "./in-process";

const MODEL: ModelNames = "Power Law Regression Median";
const SMALL_GRID = 7 * 3;

export const goldenPins = {
  block: 840_000,
  frozenOrigin: 1_713_571_767_000,
  interim: "pinned-empty",
  minMaxMultiple: 3,
  model: MODEL,
  price: 64_000,
  samplesToRender: 10,
  seed: simulationSeed,
  timezone: "UTC",
  variable: 0,
  volatility: 0.1,
} as const;

export interface GridDigest {
  activeHeight: number;
  activeWidth: number;
  byteLength: number;
  bytes?: string;
  f64?: string;
  height: number;
  itemLength: number;
  sha256: string;
  width: number;
}

export interface SeriesDigest {
  label: string;
  points: number;
  yAxisID?: string;
}

export interface CaseSnapshot {
  balanceTailSha256: string;
  bandYSha256: string;
  chart?: unknown;
  chartError?: string;
  chartSha256?: string;
  dataLength: number;
  datasetYSha256: string;
  grids: {
    balance: GridDigest;
    price: GridDigest;
    walk: GridDigest;
  };
  input: {
    clampBottom: boolean;
    clampTop: boolean;
    epochs: number;
    fiatCount: number;
    inflation: number;
    items: CaseInput["items"];
    renderDrawdownDistribution: CaseInput["renderDrawdownDistribution"];
    renderDrawdownWalks: false;
    renderModelMax: boolean;
    renderModelMin: boolean;
    renderPriceDistribution: CaseInput["renderPriceDistribution"];
    renderPriceWalks: boolean;
    samples: number;
    showHistoric: boolean;
    showModel: boolean;
    walk: WalkTypes;
    weeksSince: number;
  };
  name: string;
  pointCount: number;
  series: SeriesDigest[];
  simulationAverage: string;
  simulationMedian: string;
  volumeAverage: string;
  volumeMedian: string;
  weeksSince: number;
  zero: number;
}

export interface SettledMemory {
  balance: GrowableSharedArray;
  finals: Map<string, VariableDrawdownFinal>;
  prices: GrowableSharedArray;
  variables: Map<string, VariableDrawdownCache>;
  walk: GrowableSharedArray;
}

export const createMemory = (epochs: number, samples: number): SettledMemory => ({
  balance: new GrowableSharedArray(epochs, samples, WEEKS_PER_EPOCH),
  finals: new Map(),
  prices: new GrowableSharedArray(epochs, samples, WEEKS_PER_EPOCH),
  variables: new Map(),
  walk: new GrowableSharedArray(epochs, samples, WALK_STATE_LENGTH),
});

let storageReady = false;

const ensureStorage = (): void => {
  if (storageReady) return;
  const store = new Map<string, string>();
  const storage = {
    get length() {
      return store.size;
    },
    clear: (): void => {
      store.clear();
    },
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => [...store.keys()][index] ?? null,
    removeItem: (key: string): void => {
      store.delete(key);
    },
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
  } satisfies Storage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
    writable: true,
  });
  storageReady = true;
};

const floatHex = (value: number): string => {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value, true);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sha256 = async (bytes: Uint8Array): Promise<string> => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const hashFloats = async (values: ArrayLike<number>): Promise<string> => {
  const floats = new Float64Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === undefined) throw new Error("missing float");
    floats[index] = value;
  }
  return sha256(new Uint8Array(floats.buffer));
};

const bufferBytes = (buffer: SharedArrayBuffer): Uint8Array => {
  const view = new Uint8Array(buffer);
  const bytes = new Uint8Array(view.byteLength);
  bytes.set(view);
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte === undefined) throw new Error("missing byte");
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const digestGrid = async (grid: GrowableSharedArray, keepBytes: boolean): Promise<GridDigest> => {
  const state = grid.exportState();
  const bytes = bufferBytes(state.sharedBuffer);
  const digest: GridDigest = {
    activeHeight: state.activeHeight,
    activeWidth: state.activeWidth,
    byteLength: bytes.byteLength,
    height: state.height,
    itemLength: state.itemLength,
    sha256: await sha256(bytes),
    width: state.width,
  };
  if (keepBytes) digest.f64 = bytesToBase64(bytes);
  return digest;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stableValue = (value: unknown, seen: WeakSet<object>): unknown => {
  if (typeof value === "function" || value === undefined) return undefined;
  if (typeof value === "bigint" || typeof value === "symbol") {
    throw new Error("chart options contain a non-json value");
  }
  if (typeof value === "number")
    return Number.isFinite(value) ? value : { float64: floatHex(value) };
  if (typeof value !== "object" || value === null) return value;
  if (value instanceof Date) return { date: value.getTime() };
  if (seen.has(value)) throw new Error("chart options contain a cycle");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => {
        const next = stableValue(item, seen);
        return next === undefined ? null : next;
      });
    }
    if (!isRecord(value)) throw new Error("chart options contain an unsupported value");
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).toSorted()) {
      const next = stableValue(value[key], seen);
      if (next !== undefined) output[key] = next;
    }
    return output;
  } finally {
    seen.delete(value);
  }
};

const chartSnapshot = async (
  options: unknown,
): Promise<{ chart?: unknown; chartError?: string; chartSha256?: string }> => {
  try {
    const chart = stableValue(options, new WeakSet());
    const json = JSON.stringify(chart);
    return { chart, chartSha256: await sha256(new TextEncoder().encode(json)) };
  } catch (error) {
    const chartError = error instanceof Error ? error.message : String(error);
    return { chartError };
  }
};

const pointsOf = (datasets: DatasetList): { series: SeriesDigest[]; y: number[] } => {
  const series: SeriesDigest[] = [];
  const y: number[] = [];
  for (const dataset of datasets) {
    const entry: SeriesDigest = {
      label: typeof dataset.label === "string" ? dataset.label : "",
      points: dataset.data.length,
    };
    if (typeof dataset.yAxisID === "string") entry.yAxisID = dataset.yAxisID;
    series.push(entry);
    for (const [index, point] of dataset.data.entries()) {
      if (typeof point.y !== "number") {
        throw new Error(`${entry.label} point ${index} y is missing`);
      }
      y.push(point.y);
    }
  }
  return { series, y };
};

const runNode = async <T>(body: (signal: AbortSignal) => Promise<T> | T): Promise<T> => {
  const controller = new AbortController();
  try {
    return await body(controller.signal);
  } finally {
    controller.abort();
  }
};

const expectOk = (name: string, value: string): void => {
  if (value.startsWith("failed")) throw new Error(`${name} ${value}`);
};

const buildItems = (
  input: CaseInput,
): { fiat: OneOffFiatVariable[]; oneOff: OneOffItem[]; reoccurring: ReoccurringItem[] } => {
  const reoccurring: ReoccurringItem[] = [];
  const oneOff: OneOffItem[] = [];
  if (input.items === "default") {
    reoccurring.push({
      active: true,
      annualAmount: 100_000,
      annualPercentChange: 0,
      effective: new Date(Date.now() + 8 * MS_PER_YEAR),
      expense: true,
      id: "item-1",
      isFiat: true,
      name: "Live off Bitcoin",
    });
  } else if (input.items === "ten") {
    for (let index = 0; index < 10; index += 1) {
      reoccurring.push({
        active: true,
        annualAmount: 10_000 * (index + 1),
        annualPercentChange: 0,
        effective: new Date(Date.now() + (8 + index * 10) * MS_PER_WEEK),
        expense: true,
        id: `re-${index}`,
        isFiat: true,
        name: `Spend ${index}`,
      });
      oneOff.push({
        active: true,
        amountToday: 1_000 * (index + 1),
        effective: new Date(Date.now() + (12 + index * 10) * MS_PER_WEEK),
        expense: true,
        id: `once-${index}`,
        isFiat: index % 2 === 0,
        name: `Once ${index}`,
      });
    }
  } else if (input.items !== "none") {
    const unexpected: never = input.items;
    throw new Error(`unknown items ${String(unexpected)}`);
  }

  const fiat: OneOffFiatVariable[] = [];
  for (let index = 0; index < input.fiatCount; index += 1) {
    const amountToday = 1_000_000 * (index + 1);
    const btcWillingToSpend = 1 + index;
    const delay = index;
    const start = 50 + index * 10;
    fiat.push({
      active: true,
      amountToday,
      btcWillingToSpend,
      delay,
      hash: hashSum({ amountToday, btcWillingToSpend, delay, start }),
      id: `fiat-${index}`,
      name: `Spend ${index}`,
      start,
    });
  }
  return { fiat, oneOff, reoccurring };
};

const settleAt = async (input: CaseInput, memory: SettledMemory): Promise<CaseSnapshot> => {
  ensureStorage();
  const now = Date.now();
  const halvings = loadHalvings();
  const counted = weeksSinceLastHalving(halvings);
  if (counted !== input.weeksSince) {
    throw new Error(`${input.name} weeksSince ${counted} !== ${input.weeksSince}`);
  }
  const dataLength = input.epochs * WEEKS_PER_EPOCH - input.weeksSince;
  if (dataLength <= 0) throw new Error(`${input.name} dataLength ${dataLength}`);

  const { fiat, oneOff, reoccurring } = buildItems(input);
  const activeFiat = fiat.filter(({ active }) => active);
  const narrowed: NarrowedOneOffFiat[] = activeFiat.map((item) => ({
    amountToday: item.amountToday,
    btcWillingToSpend: item.btcWillingToSpend,
    delay: item.delay,
    hash: item.hash,
    start: item.start,
  }));
  const bitcoin = 50 / 2 ** Object.keys(halvings).length;
  const weeklyInflationRate = (1 + input.inflation / 100) ** (1 / WEEKS_PER_YEAR) - 1;
  const full: Full = {
    clampBottom: input.clampBottom,
    clampTop: input.clampTop,
    minMaxMultiple: goldenPins.minMaxMultiple,
    model: goldenPins.model,
    seed: goldenPins.seed,
    variable: goldenPins.variable,
    volatility: goldenPins.volatility,
    walk: input.walk,
  };
  const fullHash = hashSum(full);
  const activeOneOffVariablesHash = hashSum({
    hashes: activeFiat
      .map(({ hash }) => hash)
      .toSorted()
      .join(","),
  });
  const variableCacheHash = hashSum({
    activeOneOffVariablesHash,
    epochCount: input.epochs,
    fullHash,
    inflation: input.inflation,
    samples: input.samples,
    weeksSince: input.weeksSince,
  });
  const volumeCacheHash = hashSum({
    activeOneOffVariablesHash,
    bitcoin,
    fullHash,
    inflation: input.inflation,
    oneOffItems: oneOff,
    reoccurringItems: reoccurring,
  });
  const fullHashInflation = hashSum({ fullHash, weeklyInflationRate });
  const worker = inProcessWorker();
  const hash = input.name;

  const interimDataset = await runNode((signal) =>
    handleInterimDataset(signal, hash, [], input.showHistoric),
  );
  const inflationFactors = await runNode((signal) =>
    handleInflationFactors(signal, hash, weeklyInflationRate),
  );
  const gate = await runNode((signal) =>
    handleEnsureNotZero(signal, hash, goldenPins.block, goldenPins.price),
  );
  if (gate !== "Success") throw new Error(`${input.name} price gate returned ${gate}`);

  const halvingAnnotations = await runNode((signal) =>
    handleHalvingAnnotations(signal, hash, halvings),
  );
  const maxSlot = {
    key: "",
    logs: new Float64Array(0),
    points: new Float64Array(0),
    seriesHash: "",
    weeks: 0,
  };
  const minSlot = {
    key: "",
    logs: new Float64Array(0),
    points: new Float64Array(0),
    seriesHash: "",
    weeks: 0,
  };
  const cashflowSlot = {
    bitcoin: new Float64Array(0),
    fiat: new Float64Array(0),
    key: "",
    seriesHash: "",
    weeks: 0,
  };
  const maxArray = await runNode((signal) =>
    handleMaxArray(
      signal,
      hash,
      goldenPins.block,
      goldenPins.minMaxMultiple,
      goldenPins.model,
      goldenPins.variable,
      goldenPins.price,
      now,
      dataLength,
      input.weeksSince,
      maxSlot,
    ),
  );
  const maxDataset = await runNode((signal) =>
    handleMaxModel(signal, hash, input.renderModelMax, maxArray, now, dataLength),
  );
  const minArray = await runNode((signal) =>
    handleMinArray(
      signal,
      hash,
      goldenPins.block,
      goldenPins.minMaxMultiple,
      goldenPins.model,
      goldenPins.variable,
      goldenPins.price,
      now,
      dataLength,
      input.weeksSince,
      minSlot,
    ),
  );
  const minDataset = await runNode((signal) =>
    handleMinModel(signal, hash, input.renderModelMin, minArray, now, dataLength),
  );
  const drawdownStatic = await runNode((signal) =>
    handleDrawdownStatic(
      signal,
      hash,
      dataLength,
      now,
      oneOff,
      reoccurring,
      inflationFactors,
      weeklyInflationRate,
      input.weeksSince,
      cashflowSlot,
    ),
  );
  const simulation = await runNode((signal) =>
    handleSimulation(
      signal,
      hash,
      goldenPins.price,
      minArray,
      maxArray,
      input.epochs,
      memory.prices,
      memory.walk,
      input.samples,
      worker,
      input.weeksSince,
      dataLength,
      full,
      fullHash,
      minSlot.seriesHash,
      maxSlot.seriesHash,
    ),
  );
  expectOk(input.name, simulation);
  const simulationStats = await runNode((signal) =>
    handleSimulationStats(signal, hash, memory.prices, input.epochs * WEEKS_PER_EPOCH - 1),
  );
  const variables = await runNode((signal) =>
    handleDrawdownVariables(
      signal,
      hash,
      dataLength,
      input.samples,
      fullHashInflation,
      memory.prices,
      memory.finals,
      narrowed,
      memory.variables,
      worker,
      inflationFactors,
      input.weeksSince,
      variableCacheHash,
      input.showModel,
    ),
  );
  expectOk(input.name, variables);
  const labels = await runNode((signal) =>
    handleDrawdownVariableLabels(signal, hash, activeFiat, memory.variables, input.showModel),
  );
  const chartOptions = await runNode((signal) =>
    handleChartOptions(
      signal,
      hash,
      halvingAnnotations,
      now,
      reoccurring,
      dataLength,
      oneOff,
      input.showModel,
      labels,
      input.showHistoric,
    ),
  );
  const volume = await runNode((signal) =>
    handleVolume(
      signal,
      hash,
      bitcoin,
      drawdownStatic,
      memory.finals,
      input.samples,
      input.epochs,
      memory.prices,
      memory.balance,
      volumeCacheHash,
      variableCacheHash,
      walkedPriceIdentity(fullHash, goldenPins.price, minSlot.seriesHash, maxSlot.seriesHash),
      input.weeksSince,
      dataLength,
      worker,
      input.showModel,
    ),
  );
  expectOk(input.name, volume);
  const zeroCount = await runNode((signal) =>
    calculateBalanceAndZero(
      signal,
      hash,
      memory.balance,
      input.showModel,
      input.epochs * WEEKS_PER_EPOCH - 1,
    ),
  );
  const volumeStats = await runNode((signal) =>
    calculateVolumeStatistics(signal, hash, dataLength, zeroCount, input.showModel),
  );
  // The y-slot key has to stay put when a rerun returns "no tasks".
  const priceBands = await runNode((signal) =>
    handleDistribution(
      signal,
      hash,
      memory.prices,
      now,
      worker,
      input.samples,
      dataLength,
      input.weeksSince,
      input.renderPriceDistribution,
      "price",
      false,
      walkedPriceIdentity(fullHash, goldenPins.price, minSlot.seriesHash, maxSlot.seriesHash),
    ),
  );
  const priceWalks = await runNode((signal) =>
    handlePriceWalkDataset(
      signal,
      hash,
      now,
      memory.prices,
      input.renderPriceWalks,
      goldenPins.samplesToRender,
      input.weeksSince,
      dataLength,
    ),
  );
  const storedFinal = memory.finals.get(variableCacheHash);
  const spend = storedFinal === undefined ? "missing" : storedFinal.spendHash();
  const drawdownBands = await runNode((signal) =>
    handleDistribution(
      signal,
      hash,
      memory.balance,
      now,
      worker,
      input.samples,
      dataLength,
      input.weeksSince,
      input.renderDrawdownDistribution,
      "drawdown",
      input.showModel,
      drawdownBandIdentity(
        volumeCacheHash,
        spend,
        drawdownStatic.seriesHash,
        walkedPriceIdentity(fullHash, goldenPins.price, minSlot.seriesHash, maxSlot.seriesHash),
      ),
    ),
  );
  const drawdownWalks = await runNode((signal) =>
    handleDrawdownWalkDataset(
      signal,
      hash,
      now,
      memory.balance,
      false,
      goldenPins.samplesToRender,
      input.weeksSince,
      dataLength,
      input.showModel,
    ),
  );
  const dataProperties = await runNode((signal) =>
    handleDataProperties(
      signal,
      hash,
      drawdownBands,
      drawdownWalks,
      interimDataset,
      maxDataset,
      minDataset,
      priceBands,
      priceWalks,
      input.showHistoric,
    ),
  );

  const keepBytes = input.samples * input.epochs <= SMALL_GRID;
  const plotted = pointsOf(dataProperties.datasets);
  const bands = pointsOf([...priceBands, ...drawdownBands]);
  const chart = await chartSnapshot(chartOptions);
  const snapshot: CaseSnapshot = {
    balanceTailSha256: await hashFloats(zeroCount.finalBalance),
    bandYSha256: await hashFloats(bands.y),
    dataLength,
    datasetYSha256: await hashFloats(plotted.y),
    grids: {
      balance: await digestGrid(memory.balance, keepBytes),
      price: await digestGrid(memory.prices, keepBytes),
      walk: await digestGrid(memory.walk, keepBytes),
    },
    input: {
      clampBottom: input.clampBottom,
      clampTop: input.clampTop,
      epochs: input.epochs,
      fiatCount: input.fiatCount,
      inflation: input.inflation,
      items: input.items,
      renderDrawdownDistribution: input.renderDrawdownDistribution,
      renderDrawdownWalks: false,
      renderModelMax: input.renderModelMax,
      renderModelMin: input.renderModelMin,
      renderPriceDistribution: input.renderPriceDistribution,
      renderPriceWalks: input.renderPriceWalks,
      samples: input.samples,
      showHistoric: input.showHistoric,
      showModel: input.showModel,
      walk: input.walk,
      weeksSince: input.weeksSince,
    },
    name: input.name,
    pointCount: plotted.y.length,
    series: plotted.series,
    simulationAverage: floatHex(simulationStats.average),
    simulationMedian: floatHex(simulationStats.median),
    volumeAverage: floatHex(volumeStats.average),
    volumeMedian: floatHex(volumeStats.median),
    weeksSince: input.weeksSince,
    zero: zeroCount.zero,
  };
  if (chart.chart !== undefined) snapshot.chart = chart.chart;
  if (chart.chartError !== undefined) snapshot.chartError = chart.chartError;
  if (chart.chartSha256 !== undefined) snapshot.chartSha256 = chart.chartSha256;
  return snapshot;
};

export const settle = async (input: CaseInput, memory: SettledMemory): Promise<CaseSnapshot> => {
  const restore = installFrozenClock(goldenPins.frozenOrigin + input.weeksSince * MS_PER_WEEK);
  try {
    return await settleAt(input, memory);
  } finally {
    restore();
  }
};
