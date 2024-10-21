import { type ChartOptions } from "chart.js";
import hashSum from "hash-sum";
import React, { createContext, useContext, useMemo } from "react";

import { WEEKS_PER_EPOCH, WEEKS_PER_YEAR } from "../../constants";
import { weeksSinceLastHalving } from "../../helpers";
import {
  type DatasetList,
  type Full,
  type ProviderProperties,
} from "../../types";
import { useDrawdown } from "../drawdown";
import { useModel } from "../model";
import { useRender } from "../render";
import { useTime } from "../time";
import { useWorker } from "../workers";
import { handleChartOptions } from "./chart-options";
import { handleEnsureNotZero } from "./current";
import { handleDataProperties } from "./data-properties";
import { handleDistribution } from "./distribution";
import { handleDrawdownStatic } from "./drawdown-static";
import { handleDrawdownVariables } from "./drawdown-variable";
import { handleDrawdownVariableStats } from "./drawdown-variable-stats";
import { handleDrawdownWalkDataset } from "./drawdown-walks";
import { handleHalvingAnnotations } from "./halving-annotations";
import { useCurrentPrice } from "./hooks/use-current-price";
import { narrow, useDependency } from "./hooks/use-dependancy";
import { useHalvings } from "./hooks/use-halvings";
import { useInterimDataset } from "./hooks/use-interim";
import { handleInflationFactors } from "./inflation-factors";
import { handleInterimDataset } from "./interim";
import { handleMaxArray } from "./max-array";
import { handleMaxModel } from "./max-dataset";
import { handleMinArray } from "./min-array";
import { handleMinModel } from "./min-dataset";
import { handlePriceWalkDataset } from "./price-walks";
import { handleSimulation } from "./simulation";
import { handleSimulationStats } from "./simulation-statistics";
import { handleVolume } from "./volume";
import { calculateVolumeStatistics } from "./volume-statistics";
import { calculateBalanceAndZero } from "./zero-count";

interface ComputedContextType {
  chartOptions: ChartOptions<"line"> | null;
  dataLength: number;
  dataProperties: { datasets: DatasetList } | null;
  simulationStats: { average: number; median: number } | null;
  volumeStats: { average: number; median: number } | null;
  zeroCount: { finalBalance: Float64Array; zero: number } | null;
}

// eslint-disable-next-line unicorn/no-null
const ComputedContext = createContext<ComputedContextType | null>(null);

const useDep = <T extends unknown[]>(...deps: T): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => deps, deps);
};

export const ComputedProvider: React.FC<ProviderProperties> = ({
  children,
}) => {
  const {
    renderDrawdownDistribution,
    renderDrawdownWalks,
    renderModelMax,
    renderModelMin,
    renderPriceDistribution,
    renderPriceWalks,
    samplesToRender,
    showHistoric,
  } = useRender();
  const { currentBlock, halvings } = useHalvings();
  const interim = useInterimDataset();
  const {
    clampBottom,
    clampTop,
    epochCount,
    minMaxMultiple,
    model,
    samples,
    showModel,
    simulationData,
    variable,
    volatility,
    walk,
  } = useModel();
  const currentPrice = useCurrentPrice();
  const now = useTime();
  const {
    bitcoin,
    drawdownData,
    finalVariableCache,
    inflation,
    oneOffFiatVariables,
    oneOffItems,
    reoccurringItems,
    variableDrawdownCache,
  } = useDrawdown();

  const worker = useWorker();
  const weeksSince = useMemo(() => weeksSinceLastHalving(halvings), [halvings]);
  const dataLength = useMemo(
    () => epochCount * WEEKS_PER_EPOCH - weeksSince,
    [epochCount, weeksSince],
  );
  const weeklyInflationRate = useMemo(
    () => (1 + inflation / 100) ** (1 / WEEKS_PER_YEAR) - 1,
    [inflation],
  );
  const full: Full = useMemo(
    () => ({
      clampBottom,
      clampTop,
      minMaxMultiple,
      model,
      variable,
      volatility,
      walk,
    }),
    [clampBottom, clampTop, minMaxMultiple, model, variable, volatility, walk],
  );
  const fullHash = useMemo(() => hashSum(full), [full]);
  const activeOneOffVariables = useMemo(
    () => oneOffFiatVariables.filter(({ active }) => active),
    [oneOffFiatVariables],
  );
  const activeOneOffVariablesHash = useMemo(
    () =>
      hashSum({
        hashes: activeOneOffVariables
          .map(({ hash }) => hash)
          .sort()
          .join(","),
      }),
    [activeOneOffVariables],
  );
  const variableCacheHash = useMemo(
    () =>
      hashSum({
        activeOneOffVariablesHash,
        epochCount,
        fullHash,
        inflation,
        samples,
      }),
    [epochCount, fullHash, activeOneOffVariablesHash, inflation, samples],
  );
  const volumeCacheHash = useMemo(() => {
    return hashSum({
      activeOneOffVariablesHash,
      bitcoin,
      fullHash,
      inflation,
      oneOffItems,
      reoccurringItems,
    });
  }, [
    activeOneOffVariablesHash,
    bitcoin,
    fullHash,
    oneOffItems,
    reoccurringItems,
    inflation,
  ]);
  const fullHashInflation = useMemo(
    () => hashSum({ fullHash, weeklyInflationRate }),
    [fullHash, weeklyInflationRate],
  );

  // Tier 0
  const interimDataset = useDependency(
    "Interim Dataset",
    handleInterimDataset,
    useDep(interim, showHistoric),
  );

  const inflationFactors = useDependency(
    "Inflation Factors",
    handleInflationFactors,
    useDep(weeklyInflationRate),
  );

  const currentNotZero = useDependency(
    "Current Price/Block Not Zero",
    handleEnsureNotZero,
    useDep(currentBlock, currentPrice),
  );

  const halvingAnnotations = useDependency(
    "Halving Annotations",
    handleHalvingAnnotations,
    useDep(halvings, currentNotZero),
  );

  const maxArray = useDependency(
    "Max Array",
    handleMaxArray,
    useDep(
      currentBlock,
      minMaxMultiple,
      model,
      variable,
      currentPrice,
      now,
      dataLength,

      currentNotZero,
    ),
  );

  const maxDataset = useDependency(
    "Max Dataset",
    handleMaxModel,
    useDep(
      renderModelMax,
      narrow(maxArray),
      now,

      maxArray,
    ),
  );

  const minArray = useDependency(
    "Min Array",
    handleMinArray,
    useDep(
      currentBlock,
      minMaxMultiple,
      model,
      variable,
      currentPrice,
      now,
      dataLength,

      currentNotZero,
    ),
  );

  const minDataset = useDependency(
    "Min Dataset",
    handleMinModel,
    useDep(
      renderModelMin,
      narrow(minArray),
      now,

      minArray,
    ),
  );

  // Tier 1
  const drawdownStatic = useDependency(
    "Drawdown Static",
    handleDrawdownStatic,
    useDep(
      dataLength,
      now,
      oneOffItems,
      reoccurringItems,
      narrow(inflationFactors),
      weeklyInflationRate,

      inflationFactors,
    ),
  );

  const simulation = useDependency(
    "Simulation",
    handleSimulation,
    useDep(
      currentPrice,
      narrow(minArray),
      narrow(maxArray),
      epochCount,
      simulationData,
      samples,
      worker,
      weeksSince,
      full,
      fullHash,

      currentNotZero,
      minArray,
      maxArray,
    ),
  );

  const simulationStats = useDependency(
    "Simulation Stats",
    handleSimulationStats,
    useDep(
      simulationData,

      simulation,
    ),
  );

  const drawdownVariables = useDependency(
    "Drawdown Variables",
    handleDrawdownVariables,
    useDep(
      epochCount,
      samples,
      fullHashInflation,
      simulationData,
      finalVariableCache,
      activeOneOffVariables,
      variableDrawdownCache,
      worker,
      narrow(inflationFactors),
      weeksSince,
      variableCacheHash,
      showModel,

      inflationFactors,
      simulation,
    ),
  );

  const drawdownVariableStats = useDependency(
    "Drawdown Variables",
    handleDrawdownVariableStats,
    useDep(
      activeOneOffVariables,
      variableDrawdownCache,
      showModel,
      narrow(drawdownVariables),

      drawdownVariables,
    ),
  );

  const chartOptions = useDependency(
    "Chart Options",
    handleChartOptions,
    useDep(
      narrow(halvingAnnotations),
      now,
      reoccurringItems,
      dataLength,
      oneOffItems,
      showModel,
      narrow(drawdownVariableStats),
      showHistoric,

      halvingAnnotations,
      drawdownVariableStats,
    ),
    false,
  );

  const volume = useDependency(
    "Volume",
    handleVolume,
    useDep(
      bitcoin,
      narrow(drawdownStatic),
      finalVariableCache,
      samples,
      epochCount,
      simulationData,
      drawdownData,
      volumeCacheHash,
      variableCacheHash,
      weeksSince,
      worker,
      showModel,

      drawdownVariables,
      drawdownStatic,
      simulation,
    ),
  );

  const zeroCount = useDependency(
    "Zero Count",
    calculateBalanceAndZero,
    useDep(
      drawdownData,
      showModel,

      volume,
    ),
  );

  const volumeStats = useDependency(
    "Volume Statistics",
    calculateVolumeStatistics,
    useDep(
      dataLength,
      narrow(zeroCount),
      showModel,

      zeroCount,
    ),
  );

  const priceDistribution = useDependency(
    "Price Distribution",
    handleDistribution,
    useDep(
      simulationData,
      now,
      worker,
      samples,
      dataLength,
      weeksSince,
      renderPriceDistribution,
      "price" as const,
      false,

      simulation,
    ),
  );

  const priceWalks = useDependency(
    "Price Walk",
    handlePriceWalkDataset,
    useDep(
      now,
      simulationData,
      renderPriceWalks,
      samplesToRender,
      weeksSince,

      simulation,
    ),
  );

  const drawdownDistribution = useDependency(
    "Drawdown Distribution",
    handleDistribution,
    useDep(
      drawdownData,
      now,
      worker,
      samples,
      dataLength,
      weeksSince,
      renderDrawdownDistribution,
      "drawdown" as const,
      showModel,

      volume,
    ),
  );

  const drawdownWalks = useDependency(
    "Drawdown Walk",
    handleDrawdownWalkDataset,
    useDep(
      now,
      drawdownData,
      renderDrawdownWalks,
      samplesToRender,
      weeksSince,
      showModel,

      volume,
    ),
  );

  const dataProperties = useDependency(
    "Data Properties",
    handleDataProperties,
    useDep(
      narrow(drawdownDistribution),
      narrow(drawdownWalks),
      narrow(interimDataset),
      narrow(maxDataset),
      narrow(minDataset),
      narrow(priceDistribution),
      narrow(priceWalks),
      showHistoric,

      drawdownDistribution,
      drawdownWalks,
      interimDataset,
      maxDataset,
      minDataset,
      priceDistribution,
      priceWalks,
    ),
    false,
  );

  const computedValues = useMemo(
    () =>
      ({
        chartOptions: chartOptions.result,
        dataLength,
        dataProperties: dataProperties.result,
        simulationStats: simulationStats.result,
        volumeStats: volumeStats.result,
        zeroCount: zeroCount.result,
      }) satisfies ComputedContextType,
    [
      chartOptions.result,
      dataLength,
      dataProperties.result,
      volumeStats.result,
      zeroCount.result,
      simulationStats.result,
    ],
  );

  return (
    <ComputedContext.Provider value={computedValues}>
      {children}
    </ComputedContext.Provider>
  );
};

// Custom hooks to access computed values
export const useComputedValues = (): ComputedContextType => {
  const context = useContext(ComputedContext);
  if (context === null) {
    throw new Error("useComputedValues must be used within a ComputedProvider");
  }
  return context;
};
