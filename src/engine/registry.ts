import { type ChartOptions } from "chart.js";
import { type LineAnnotationOptions } from "chartjs-plugin-annotation";

import { handleChartOptions } from "../contexts/computed/chart-options";
import { handleEnsureNotZero } from "../contexts/computed/current";
import { handleDataProperties } from "../contexts/computed/data-properties";
import { handleDistribution } from "../contexts/computed/distribution";
import {
  handleDrawdownStatic,
  type DrawdownStaticReturn,
} from "../contexts/computed/drawdown-static";
import { handleDrawdownVariables } from "../contexts/computed/drawdown-variable";
import {
  handleDrawdownVariableLabels,
  type FiatVariableLabel,
} from "../contexts/computed/drawdown-variable-labels";
import { handleDrawdownWalkDataset } from "../contexts/computed/drawdown-walks";
import { handleHalvingAnnotations } from "../contexts/computed/halving-annotations";
import { handleInflationFactors } from "../contexts/computed/inflation-factors";
import { handleInterimDataset } from "../contexts/computed/interim";
import { handleMaxArray } from "../contexts/computed/max-array";
import { handleMaxModel } from "../contexts/computed/max-dataset";
import { handleMinArray } from "../contexts/computed/min-array";
import { handleMinModel } from "../contexts/computed/min-dataset";
import { handlePriceWalkDataset } from "../contexts/computed/price-walks";
import { handleSimulationStats } from "../contexts/computed/simulation-statistics";
import { handleSimulation } from "../contexts/computed/simulation";
import { handleVolume } from "../contexts/computed/volume";
import { calculateVolumeStatistics } from "../contexts/computed/volume-statistics";
import { calculateBalanceAndZero } from "../contexts/computed/zero-count";
import { type WorkerContextType } from "../contexts/workers/types";
import { type Dataset, type DatasetList } from "../types";
import { type GraphNode } from "./graph-scheduler";
import {
  drawdownBandIdentity,
  walkedPriceIdentity,
  type DerivedKeys,
  type EngineConfig,
} from "./keys";
import { ySlots, type EngineMemory } from "./memory";

export interface NodeSlots {
  "Chart Options": ChartOptions<"line"> | null;
  "Current Price/Block Not Zero": string | null;
  "Data Properties": { datasets: DatasetList } | null;
  "Drawdown Distribution": DatasetList | null;
  "Drawdown Static": DrawdownStaticReturn | null;
  "Drawdown Variables": string | null;
  "Drawdown Variables Labels": FiatVariableLabel[] | null;
  "Drawdown Walk": DatasetList | null;
  "Halving Annotations": LineAnnotationOptions[] | null;
  "Inflation Factors": Float64Array | null;
  "Interim Dataset": Dataset | null;
  "Max Array": Float64Array[] | null;
  "Max Dataset": DatasetList | null;
  "Min Array": Float64Array[] | null;
  "Min Dataset": DatasetList | null;
  "Price Distribution": DatasetList | null;
  "Price Walk": DatasetList | null;
  Simulation: string | null;
  "Simulation Stats": { average: number; median: number } | null;
  Volume: string | null;
  "Volume Statistics": { average: number; median: number } | null;
  "Zero Count": { finalBalance: Float64Array; zero: number } | null;
}

export interface ComputeEnv {
  config: EngineConfig;
  derived: DerivedKeys;
  memory: EngineMemory;
  slots: NodeSlots;
  worker: WorkerContextType;
}

export const emptySlots = (): NodeSlots => ({
  "Chart Options": null,
  "Current Price/Block Not Zero": null,
  "Data Properties": null,
  "Drawdown Distribution": null,
  "Drawdown Static": null,
  "Drawdown Variables": null,
  "Drawdown Variables Labels": null,
  "Drawdown Walk": null,
  "Halving Annotations": null,
  "Inflation Factors": null,
  "Interim Dataset": null,
  "Max Array": null,
  "Max Dataset": null,
  "Min Array": null,
  "Min Dataset": null,
  "Price Distribution": null,
  "Price Walk": null,
  Simulation: null,
  "Simulation Stats": null,
  Volume: null,
  "Volume Statistics": null,
  "Zero Count": null,
});

const present = <T>(value: T | null, name: string): T => {
  if (value === null) throw new Error(`${name} is not ready`);
  return value;
};

type SeriesPart = "cashflow" | "max" | "min";

interface SeriesHashes {
  cashflow: string;
  max: string;
  min: string;
}

// Max, then min, then the weekly amounts. Each one files the walked columns under the id
// simulation and volume are about to read. A from-scratch rebuild does not come through here.
const retargetExtendedSeries = (
  memory: EngineMemory,
  derived: DerivedKeys,
  currentPrice: number,
  weeksSince: number,
  part: SeriesPart,
  previousHash: string,
  nextHash: string,
): void => {
  const after: SeriesHashes = {
    cashflow: memory.cashflowSeries.seriesHash,
    max: memory.maxSeries.seriesHash,
    min: memory.minSeries.seriesHash,
  };
  if (previousHash === "" || previousHash === nextHash || after[part] !== nextHash) return;
  const before: SeriesHashes = { ...after, [part]: previousHash };
  const oldPrice = walkedPriceIdentity(derived.fullHash, currentPrice, before.min, before.max);
  const newPrice = walkedPriceIdentity(derived.fullHash, currentPrice, after.min, after.max);
  memory.simulationData.adoptSeries(`${oldPrice}:${weeksSince}`, `${newPrice}:${weeksSince}`);
  memory.walkState.adoptSeries(`${oldPrice}:${weeksSince}`, `${newPrice}:${weeksSince}`);
  const priceMarker = `${oldPrice}:`;
  if (oldPrice !== newPrice) {
    for (const kind of ["quantile", "sd"] as const) {
      const slot = ySlots.price[kind];
      if (slot.key.startsWith(priceMarker)) {
        slot.key = `${newPrice}${slot.key.slice(oldPrice.length)}`;
      }
    }
  }

  const oldBase = `${derived.volumeCacheHash}:${weeksSince}:${before.cashflow}:${oldPrice}`;
  const newBase = `${derived.volumeCacheHash}:${weeksSince}:${after.cashflow}:${newPrice}`;
  memory.drawdownData.adoptSeries(oldBase, newBase);

  // The new length's spend is published after this series grows. The band still wears the previous one.
  const published = memory.finalVariableCache.get(derived.variableCacheHash);
  let spend = "missing";
  if (published !== undefined) spend = published.spendHash();
  else if (memory.finalVariableCache.size === 1) {
    const previous = memory.finalVariableCache.values().next().value;
    if (previous !== undefined) spend = previous.spendHash();
  }
  const oldBand = drawdownBandIdentity(derived.volumeCacheHash, spend, before.cashflow, oldPrice);
  const newBand = drawdownBandIdentity(derived.volumeCacheHash, spend, after.cashflow, newPrice);
  const bandMarker = `${oldBand}:`;
  if (oldBand !== newBand) {
    for (const kind of ["quantile", "sd"] as const) {
      const slot = ySlots.drawdown[kind];
      if (slot.key.startsWith(bandMarker)) {
        slot.key = `${newBand}${slot.key.slice(oldBand.length)}`;
      }
    }
  }
};

const writeSlot = (slots: NodeSlots, name: keyof NodeSlots, value: unknown): void => {
  Object.assign(slots, { [name]: value });
};

export const buildNodes = (env: ComputeEnv): GraphNode[] => {
  const { memory, slots } = env;
  const spec = (
    name: keyof NodeSlots,
    watch: readonly string[],
    clear: boolean,
    inputs: () => readonly unknown[],
    run: (signal: AbortSignal, hash: string) => unknown,
  ): GraphNode => ({
    clear,
    clearResult: () => {
      writeSlot(slots, name, null);
    },
    commit: (value) => {
      writeSlot(slots, name, value);
    },
    hasResult: () => slots[name] !== null,
    inputs,
    name,
    run,
    watch,
  });

  const scenario = (): EngineConfig["scenario"] => env.config.scenario;
  const render = (): EngineConfig["render"] => env.config.render;
  const priceIdentity = (): string =>
    walkedPriceIdentity(
      env.derived.fullHash,
      env.config.currentPrice,
      memory.minSeries.seriesHash,
      memory.maxSeries.seriesHash,
    );
  const drawdownSeriesKey = (): string => {
    const final = memory.finalVariableCache.get(env.derived.variableCacheHash);
    const spend = final === undefined ? "missing" : final.spendHash();
    return drawdownBandIdentity(
      env.derived.volumeCacheHash,
      spend,
      memory.cashflowSeries.seriesHash,
      priceIdentity(),
    );
  };

  return [
    spec(
      "Interim Dataset",
      [],
      true,
      () => [env.config.interim, render().showHistoric],
      (signal, hash) =>
        handleInterimDataset(signal, hash, env.config.interim, render().showHistoric),
    ),
    spec(
      "Inflation Factors",
      [],
      true,
      () => [env.derived.weeklyInflationRate],
      (signal, hash) => handleInflationFactors(signal, hash, env.derived.weeklyInflationRate),
    ),
    spec(
      "Current Price/Block Not Zero",
      [],
      true,
      () => [env.config.currentBlock, env.config.currentPrice],
      (signal, hash) =>
        handleEnsureNotZero(signal, hash, env.config.currentBlock, env.config.currentPrice),
    ),
    spec(
      "Halving Annotations",
      ["Current Price/Block Not Zero"],
      true,
      () => [env.config.halvings],
      (signal, hash) => handleHalvingAnnotations(signal, hash, env.config.halvings),
    ),
    spec(
      "Max Array",
      ["Current Price/Block Not Zero"],
      true,
      () => [
        env.config.currentBlock,
        scenario().minMaxMultiple,
        scenario().model,
        scenario().variable,
        env.config.currentPrice,
        env.config.now,
        env.derived.dataLength,
        env.derived.weeksSince,
      ],
      (signal, hash) =>
        handleMaxArray(
          signal,
          hash,
          env.config.currentBlock,
          scenario().minMaxMultiple,
          scenario().model,
          scenario().variable,
          env.config.currentPrice,
          env.config.now,
          env.derived.dataLength,
          env.derived.weeksSince,
          memory.maxSeries,
          (previousHash, nextHash) => {
            retargetExtendedSeries(
              memory,
              env.derived,
              env.config.currentPrice,
              env.derived.weeksSince,
              "max",
              previousHash,
              nextHash,
            );
          },
        ),
    ),
    spec(
      "Max Dataset",
      ["Max Array"],
      true,
      () => [render().renderModelMax, slots["Max Array"], env.config.now, env.derived.dataLength],
      (signal, hash) =>
        handleMaxModel(
          signal,
          hash,
          render().renderModelMax,
          present(slots["Max Array"], "Max Array"),
          env.config.now,
          env.derived.dataLength,
        ),
    ),
    spec(
      "Min Array",
      ["Current Price/Block Not Zero"],
      true,
      () => [
        env.config.currentBlock,
        scenario().minMaxMultiple,
        scenario().model,
        scenario().variable,
        env.config.currentPrice,
        env.config.now,
        env.derived.dataLength,
        env.derived.weeksSince,
      ],
      (signal, hash) =>
        handleMinArray(
          signal,
          hash,
          env.config.currentBlock,
          scenario().minMaxMultiple,
          scenario().model,
          scenario().variable,
          env.config.currentPrice,
          env.config.now,
          env.derived.dataLength,
          env.derived.weeksSince,
          memory.minSeries,
          (previousHash, nextHash) => {
            retargetExtendedSeries(
              memory,
              env.derived,
              env.config.currentPrice,
              env.derived.weeksSince,
              "min",
              previousHash,
              nextHash,
            );
          },
        ),
    ),
    spec(
      "Min Dataset",
      ["Min Array"],
      true,
      () => [render().renderModelMin, slots["Min Array"], env.config.now, env.derived.dataLength],
      (signal, hash) =>
        handleMinModel(
          signal,
          hash,
          render().renderModelMin,
          present(slots["Min Array"], "Min Array"),
          env.config.now,
          env.derived.dataLength,
        ),
    ),
    spec(
      "Drawdown Static",
      ["Inflation Factors"],
      true,
      () => [
        env.derived.dataLength,
        env.config.now,
        scenario().oneOffItems,
        scenario().reoccurringItems,
        slots["Inflation Factors"],
        env.derived.weeklyInflationRate,
        env.derived.weeksSince,
      ],
      (signal, hash) =>
        handleDrawdownStatic(
          signal,
          hash,
          env.derived.dataLength,
          env.config.now,
          scenario().oneOffItems,
          scenario().reoccurringItems,
          present(slots["Inflation Factors"], "Inflation Factors"),
          env.derived.weeklyInflationRate,
          env.derived.weeksSince,
          memory.cashflowSeries,
          (previousHash, nextHash) => {
            retargetExtendedSeries(
              memory,
              env.derived,
              env.config.currentPrice,
              env.derived.weeksSince,
              "cashflow",
              previousHash,
              nextHash,
            );
          },
        ),
    ),
    spec(
      "Simulation",
      ["Current Price/Block Not Zero", "Min Array", "Max Array"],
      true,
      () => [
        env.config.currentPrice,
        slots["Min Array"],
        slots["Max Array"],
        env.derived.epochs,
        memory.simulationData,
        memory.walkState,
        env.config.samples,
        env.worker,
        env.derived.weeksSince,
        env.derived.dataLength,
        env.derived.full,
        env.derived.fullHash,
        memory.minSeries.seriesHash,
        memory.maxSeries.seriesHash,
      ],
      (signal, hash) =>
        handleSimulation(
          signal,
          hash,
          env.config.currentPrice,
          present(slots["Min Array"], "Min Array"),
          present(slots["Max Array"], "Max Array"),
          env.derived.epochs,
          memory.simulationData,
          memory.walkState,
          env.config.samples,
          env.worker,
          env.derived.weeksSince,
          env.derived.dataLength,
          env.derived.full,
          env.derived.fullHash,
          memory.minSeries.seriesHash,
          memory.maxSeries.seriesHash,
        ),
    ),
    spec(
      "Simulation Stats",
      ["Simulation"],
      true,
      () => [memory.simulationData, env.derived.weeksSince, env.derived.dataLength],
      (signal, hash) =>
        handleSimulationStats(
          signal,
          hash,
          memory.simulationData,
          env.derived.weeksSince + env.derived.dataLength - 1,
        ),
    ),
    spec(
      "Drawdown Variables",
      ["Inflation Factors", "Simulation"],
      true,
      () => [
        env.derived.dataLength,
        env.config.samples,
        env.derived.fullHashInflation,
        memory.simulationData,
        memory.finalVariableCache,
        env.derived.activeToProcess,
        memory.variableDrawdownCache,
        env.worker,
        slots["Inflation Factors"],
        env.derived.weeksSince,
        env.derived.variableCacheHash,
        scenario().showModel,
      ],
      (signal, hash) =>
        handleDrawdownVariables(
          signal,
          hash,
          env.derived.dataLength,
          env.config.samples,
          env.derived.fullHashInflation,
          memory.simulationData,
          memory.finalVariableCache,
          env.derived.activeToProcess,
          memory.variableDrawdownCache,
          env.worker,
          present(slots["Inflation Factors"], "Inflation Factors"),
          env.derived.weeksSince,
          env.derived.variableCacheHash,
          scenario().showModel,
        ),
    ),
    spec(
      "Drawdown Variables Labels",
      ["Drawdown Variables"],
      true,
      () => [
        env.derived.activeOneOffVariables,
        memory.variableDrawdownCache,
        scenario().showModel,
        slots["Drawdown Variables"],
      ],
      (signal, hash) =>
        handleDrawdownVariableLabels(
          signal,
          hash,
          env.derived.activeOneOffVariables,
          memory.variableDrawdownCache,
          scenario().showModel,
        ),
    ),
    spec(
      "Chart Options",
      ["Halving Annotations", "Drawdown Variables Labels"],
      false,
      () => [
        slots["Halving Annotations"],
        env.config.now,
        scenario().reoccurringItems,
        env.derived.dataLength,
        scenario().oneOffItems,
        scenario().showModel,
        slots["Drawdown Variables Labels"],
        render().showHistoric,
      ],
      (signal, hash) =>
        handleChartOptions(
          signal,
          hash,
          present(slots["Halving Annotations"], "Halving Annotations"),
          env.config.now,
          scenario().reoccurringItems,
          env.derived.dataLength,
          scenario().oneOffItems,
          scenario().showModel,
          present(slots["Drawdown Variables Labels"], "Drawdown Variables Labels"),
          render().showHistoric,
        ),
    ),
    spec(
      "Volume",
      ["Drawdown Variables", "Drawdown Static", "Simulation"],
      true,
      () => [
        env.config.stack.bitcoin,
        slots["Drawdown Static"],
        memory.finalVariableCache,
        env.config.samples,
        env.derived.epochs,
        memory.simulationData,
        memory.drawdownData,
        env.derived.volumeCacheHash,
        env.derived.variableCacheHash,
        priceIdentity(),
        env.derived.weeksSince,
        env.derived.dataLength,
        env.worker,
        scenario().showModel,
      ],
      (signal, hash) =>
        handleVolume(
          signal,
          hash,
          env.config.stack.bitcoin,
          present(slots["Drawdown Static"], "Drawdown Static"),
          memory.finalVariableCache,
          env.config.samples,
          env.derived.epochs,
          memory.simulationData,
          memory.drawdownData,
          env.derived.volumeCacheHash,
          env.derived.variableCacheHash,
          priceIdentity(),
          env.derived.weeksSince,
          env.derived.dataLength,
          env.worker,
          scenario().showModel,
        ),
    ),
    spec(
      "Zero Count",
      ["Volume"],
      true,
      () => [
        memory.drawdownData,
        scenario().showModel,
        env.derived.weeksSince,
        env.derived.dataLength,
      ],
      (signal, hash) =>
        calculateBalanceAndZero(
          signal,
          hash,
          memory.drawdownData,
          scenario().showModel,
          env.derived.weeksSince + env.derived.dataLength - 1,
        ),
    ),
    spec(
      "Volume Statistics",
      ["Zero Count"],
      true,
      () => [env.derived.dataLength, slots["Zero Count"], scenario().showModel],
      (signal, hash) =>
        calculateVolumeStatistics(
          signal,
          hash,
          env.derived.dataLength,
          present(slots["Zero Count"], "Zero Count"),
          scenario().showModel,
        ),
    ),
    spec(
      "Price Distribution",
      ["Simulation"],
      true,
      () => [
        memory.simulationData,
        env.config.now,
        env.worker,
        env.config.samples,
        env.derived.dataLength,
        env.derived.weeksSince,
        render().renderPriceDistribution,
        "price",
        false,
        priceIdentity(),
      ],
      (signal, hash) =>
        handleDistribution(
          signal,
          hash,
          memory.simulationData,
          env.config.now,
          env.worker,
          env.config.samples,
          env.derived.dataLength,
          env.derived.weeksSince,
          render().renderPriceDistribution,
          "price",
          false,
          priceIdentity(),
        ),
    ),
    spec(
      "Price Walk",
      ["Simulation"],
      true,
      () => [
        env.config.now,
        memory.simulationData,
        render().renderPriceWalks,
        render().samplesToRender,
        env.derived.weeksSince,
        env.derived.dataLength,
      ],
      (signal, hash) =>
        handlePriceWalkDataset(
          signal,
          hash,
          env.config.now,
          memory.simulationData,
          render().renderPriceWalks,
          render().samplesToRender,
          env.derived.weeksSince,
          env.derived.dataLength,
        ),
    ),
    spec(
      "Drawdown Distribution",
      ["Volume"],
      true,
      () => [
        memory.drawdownData,
        env.config.now,
        env.worker,
        env.config.samples,
        env.derived.dataLength,
        env.derived.weeksSince,
        render().renderDrawdownDistribution,
        "drawdown",
        scenario().showModel,
        drawdownSeriesKey(),
      ],
      (signal, hash) =>
        handleDistribution(
          signal,
          hash,
          memory.drawdownData,
          env.config.now,
          env.worker,
          env.config.samples,
          env.derived.dataLength,
          env.derived.weeksSince,
          render().renderDrawdownDistribution,
          "drawdown",
          scenario().showModel,
          drawdownSeriesKey(),
        ),
    ),
    spec(
      "Drawdown Walk",
      ["Volume"],
      true,
      () => [
        env.config.now,
        memory.drawdownData,
        render().renderDrawdownWalks,
        render().samplesToRender,
        env.derived.weeksSince,
        env.derived.dataLength,
        scenario().showModel,
      ],
      (signal, hash) =>
        handleDrawdownWalkDataset(
          signal,
          hash,
          env.config.now,
          memory.drawdownData,
          render().renderDrawdownWalks,
          render().samplesToRender,
          env.derived.weeksSince,
          env.derived.dataLength,
          scenario().showModel,
        ),
    ),
    spec(
      "Data Properties",
      [
        "Drawdown Distribution",
        "Drawdown Walk",
        "Interim Dataset",
        "Max Dataset",
        "Min Dataset",
        "Price Distribution",
        "Price Walk",
      ],
      false,
      () => [
        slots["Drawdown Distribution"],
        slots["Drawdown Walk"],
        slots["Interim Dataset"],
        slots["Max Dataset"],
        slots["Min Dataset"],
        slots["Price Distribution"],
        slots["Price Walk"],
        render().showHistoric,
      ],
      (signal, hash) =>
        handleDataProperties(
          signal,
          hash,
          present(slots["Drawdown Distribution"], "Drawdown Distribution"),
          present(slots["Drawdown Walk"], "Drawdown Walk"),
          present(slots["Interim Dataset"], "Interim Dataset"),
          present(slots["Max Dataset"], "Max Dataset"),
          present(slots["Min Dataset"], "Min Dataset"),
          present(slots["Price Distribution"], "Price Distribution"),
          present(slots["Price Walk"], "Price Walk"),
          render().showHistoric,
        ),
    ),
  ];
};
