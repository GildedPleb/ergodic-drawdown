import hashSum from "hash-sum";
import React, { createContext, useCallback, useContext, useMemo } from "react";

import { WEEKS_PER_EPOCH, WEEKS_PER_YEAR } from "../constants";
import { useCurrentPrice } from "../data/effects/current-price";
import { narrow, useDependency } from "../data/effects/hooks/use-dependancy";
import { useHalvings } from "../data/effects/use-halvings";
import { weeksSinceLastHalving } from "../helpers";
import { type DatasetList, type Full, type ProviderProperties } from "../types";
import { useDistribution } from "./compute/distribution";
import {
  type DrawdownStaticReturn,
  handleDrawdownStatic,
} from "./compute/drawdown-static";
import { useDrawdownVariables } from "./compute/drawdown-variable";
import { useInflationFactors } from "./compute/inflation-factors";
import { useMaxArray } from "./compute/max-array";
import { useMinArray } from "./compute/min-array";
import { useSimulation } from "./compute/simulation";
import { useVolume } from "./compute/volume";
import { calculateVolumeStatistics } from "./compute/volume-statistics";
import { calculateBalanceAndZero } from "./compute/zero-count";
import { useDrawdown } from "./drawdown";
import { useModel } from "./model";
import { usePriceData } from "./price";
import { useRender } from "./render";
import { useTime } from "./time";
import { useVolumeData } from "./volume";
import { useWorker } from "./workers";

interface ComputedContextType {
  dataLength: number;
  drawdownDistribution: DatasetList | null;
  drawdownStatic: DrawdownStaticReturn | null;
  inflationFactors: Float64Array | null;
  maxArray: Float64Array[] | null;
  minArray: Float64Array[] | null;
  priceData: Float64Array[] | null;
  priceDistribution: DatasetList | null;
  volume: Float64Array[] | null;
  volumeStats: {
    average: number;
    median: number;
  } | null;
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
  const { renderDrawdownDistribution, renderPriceDistribution } = useRender();
  const { currentBlock, halvings } = useHalvings();
  const {
    clampBottom,
    clampTop,
    epochCount,
    minMaxMultiple,
    model,
    samples,
    showModel,
    variable,
    volatility,
    walk,
  } = useModel();
  const { priceDataPool } = usePriceData();
  const currentPrice = useCurrentPrice();
  const now = useTime();
  const {
    bitcoin,
    finalVariableCache,
    inflation,
    oneOffFiatVariables,
    oneOffItems,
    reoccurringItems,
    variableDrawdownCache,
  } = useDrawdown();
  const { volumeDataPool } = useVolumeData();

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
  const volumeCacheHash = useMemo(
    () =>
      hashSum({
        activeOneOffVariablesHash,
        bitcoin,
        fullHash,
        inflation,
        oneOffItems,
        reoccurringItems,
      }),
    [
      activeOneOffVariablesHash,
      bitcoin,
      fullHash,
      oneOffItems,
      reoccurringItems,
      inflation,
    ],
  );
  const fullHashInflation = useMemo(
    () => hashSum({ fullHash, weeklyInflationRate }),
    [fullHash, weeklyInflationRate],
  );

  const currentFunction = useCallback(
    async (
      sig: AbortSignal,
      _hash: string,
      block: number,
      price: number,
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (block !== 0 && price !== 0) resolve("Success");
        const timer = setTimeout(reject, 10_000);
        sig.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve("Success");
        });
      });
    },
    [],
  );

  // Tier 0
  const inflationFactors = useDependency(
    "Inflation Factors",
    useInflationFactors,
    useDep(weeklyInflationRate),
  );

  const currentNotZero = useDependency(
    "Current Price/Block",
    currentFunction,
    useDep(currentBlock, currentPrice),
  );

  const maxArray = useDependency(
    "Max Array",
    useMaxArray,
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

  const minArray = useDependency(
    "Min Array",
    useMinArray,
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
    "Base Simulation",
    useSimulation,
    useDep(
      currentPrice,
      narrow(minArray),
      narrow(maxArray),
      epochCount,
      priceDataPool,
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

  const drawdownVariables = useDependency(
    "Drawdown Variables",
    useDrawdownVariables,
    useDep(
      epochCount,
      samples,
      fullHashInflation,
      priceDataPool,
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

  const volume = useDependency(
    "Base Volume",
    useVolume,
    useDep(
      bitcoin,
      narrow(drawdownStatic),
      finalVariableCache,
      samples,
      epochCount,
      priceDataPool,
      volumeDataPool,
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
      narrow(volume),
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
    useDistribution,
    useDep(
      priceDataPool,
      now,
      worker,
      samples,
      epochCount,
      dataLength,
      weeksSince,
      renderPriceDistribution,
      "price",
      false,

      simulation,
    ),
  );

  const drawdownDistribution = useDependency(
    "Drawdown Distribution",
    useDistribution,
    useDep(
      volumeDataPool,
      now,
      worker,
      samples,
      epochCount,
      dataLength,
      weeksSince,
      renderDrawdownDistribution,
      "drawdown",
      showModel,

      volume,
    ),
  );

  const computedValues = useMemo(
    () =>
      ({
        dataLength,
        drawdownDistribution: drawdownDistribution.result,
        drawdownStatic: drawdownStatic.result,
        inflationFactors: inflationFactors.result,
        maxArray: maxArray.result,
        minArray: minArray.result,
        priceData: simulation.result,
        priceDistribution: priceDistribution.result,
        volume: volume.result,
        volumeStats: volumeStats.result,
        zeroCount: zeroCount.result,
      }) satisfies ComputedContextType,
    [
      dataLength,
      drawdownStatic.result,
      inflationFactors.result,
      maxArray.result,
      minArray.result,
      priceDistribution.result,
      simulation.result,
      volume.result,
      volumeStats.result,
      zeroCount.result,
      drawdownDistribution.result,
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
