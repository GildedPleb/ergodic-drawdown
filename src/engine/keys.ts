import hashSum from "hash-sum";

import { WEEKS_PER_EPOCH, WEEKS_PER_YEAR } from "../constants";
import { type WalkTypes } from "../data/walks";
import {
  type BitcoinDataPoint,
  type DistributionType,
  type Full,
  type HalvingData,
  type ModelNames,
  type NarrowedOneOffFiat,
  type OneOffFiatVariable,
  type OneOffItem,
  type ReoccurringItem,
} from "../types";

interface EngineScenario {
  clampBottom: boolean;
  clampTop: boolean;
  minMaxMultiple: number;
  model: ModelNames;
  oneOffFiatVariables: OneOffFiatVariable[];
  oneOffItems: OneOffItem[];
  reoccurringItems: ReoccurringItem[];
  showModel: boolean;
  variable: number;
  volatility: number;
  walk: WalkTypes;
}

interface EngineRender {
  renderDrawdownDistribution: DistributionType;
  renderDrawdownWalks: boolean;
  renderModelMax: boolean;
  renderModelMin: boolean;
  renderPriceDistribution: DistributionType;
  renderPriceWalks: boolean;
  samplesToRender: number | undefined;
  showHistoric: boolean;
}

export interface EngineConfig {
  currentBlock: number;
  currentPrice: number;
  epochs: number;
  halvings: HalvingData;
  inflation: { annualPercent: number; mode: "constant" };
  interim: BitcoinDataPoint[];
  now: number;
  render: EngineRender;
  samples: number;
  scenario: EngineScenario;
  seed: number;
  stack: { bitcoin: number };
}

export interface DerivedKeys {
  activeOneOffVariables: OneOffFiatVariable[];
  activeOneOffVariablesHash: string;
  activeToProcess: NarrowedOneOffFiat[];
  dataLength: number;
  full: Full;
  fullHash: string;
  fullHashInflation: string;
  variableCacheHash: string;
  volumeCacheHash: string;
  weeklyInflationRate: number;
  weeksSince: number;
}

export const deriveKeys = (config: EngineConfig, weeksSince: number): DerivedKeys => {
  const { scenario } = config;
  const weeklyInflationRate =
    (1 + config.inflation.annualPercent / 100) ** (1 / WEEKS_PER_YEAR) - 1;
  const full: Full = {
    clampBottom: scenario.clampBottom,
    clampTop: scenario.clampTop,
    minMaxMultiple: scenario.minMaxMultiple,
    model: scenario.model,
    seed: config.seed,
    variable: scenario.variable,
    volatility: scenario.volatility,
    walk: scenario.walk,
  };
  const fullHash = hashSum(full);
  const activeOneOffVariables = scenario.oneOffFiatVariables.filter(({ active }) => active);
  const activeToProcess = activeOneOffVariables.map((input): NarrowedOneOffFiat => ({
    amountToday: input.amountToday,
    btcWillingToSpend: input.btcWillingToSpend,
    delay: input.delay,
    hash: input.hash,
    start: input.start,
  }));
  const activeOneOffVariablesHash = hashSum({
    hashes: activeOneOffVariables
      .map(({ hash }) => hash)
      .toSorted()
      .join(","),
  });
  const variableCacheHash = hashSum({
    activeOneOffVariablesHash,
    epochCount: config.epochs,
    fullHash,
    inflation: config.inflation.annualPercent,
    samples: config.samples,
    weeksSince,
  });
  const volumeCacheHash = hashSum({
    activeOneOffVariablesHash,
    bitcoin: config.stack.bitcoin,
    fullHash,
    inflation: config.inflation.annualPercent,
    oneOffItems: scenario.oneOffItems,
    reoccurringItems: scenario.reoccurringItems,
  });
  const fullHashInflation = hashSum({ fullHash, weeklyInflationRate });
  return {
    activeOneOffVariables,
    activeOneOffVariablesHash,
    activeToProcess,
    dataLength: config.epochs * WEEKS_PER_EPOCH - weeksSince,
    full,
    fullHash,
    fullHashInflation,
    variableCacheHash,
    volumeCacheHash,
    weeklyInflationRate,
    weeksSince,
  };
};

const sameList = (left: readonly unknown[], right: readonly unknown[]): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

export const sameConfig = (left: EngineConfig, right: EngineConfig): boolean =>
  left.currentBlock === right.currentBlock &&
  left.currentPrice === right.currentPrice &&
  left.epochs === right.epochs &&
  left.halvings === right.halvings &&
  left.inflation.annualPercent === right.inflation.annualPercent &&
  left.inflation.mode === right.inflation.mode &&
  left.interim === right.interim &&
  left.now === right.now &&
  left.samples === right.samples &&
  left.seed === right.seed &&
  left.stack.bitcoin === right.stack.bitcoin &&
  left.scenario.clampBottom === right.scenario.clampBottom &&
  left.scenario.clampTop === right.scenario.clampTop &&
  left.scenario.minMaxMultiple === right.scenario.minMaxMultiple &&
  left.scenario.model === right.scenario.model &&
  left.scenario.showModel === right.scenario.showModel &&
  left.scenario.variable === right.scenario.variable &&
  left.scenario.volatility === right.scenario.volatility &&
  left.scenario.walk === right.scenario.walk &&
  sameList(left.scenario.oneOffFiatVariables, right.scenario.oneOffFiatVariables) &&
  sameList(left.scenario.oneOffItems, right.scenario.oneOffItems) &&
  sameList(left.scenario.reoccurringItems, right.scenario.reoccurringItems) &&
  left.render.renderDrawdownDistribution === right.render.renderDrawdownDistribution &&
  left.render.renderDrawdownWalks === right.render.renderDrawdownWalks &&
  left.render.renderModelMax === right.render.renderModelMax &&
  left.render.renderModelMin === right.render.renderModelMin &&
  left.render.renderPriceDistribution === right.render.renderPriceDistribution &&
  left.render.renderPriceWalks === right.render.renderPriceWalks &&
  left.render.samplesToRender === right.render.samplesToRender &&
  left.render.showHistoric === right.render.showHistoric;
