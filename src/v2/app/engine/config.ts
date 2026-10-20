/**
 * Slice 1 engine config: the Models sheet values mapped onto the engine's EngineConfig, the same
 * fields EngineBridge sets on main (src/engine-bridge.tsx). Pure. The engine is unchanged.
 * Drawdown inputs stay empty until Plans ships (Slice 2); only the price quantiles are drawn, so
 * the old chart's walk / model-line / historic overlays are off.
 */
import type { EngineConfig } from "../../../engine/keys";
import { isModelName } from "../../../data/models";
import { isWalk } from "../../../data/walks";
import type { BitcoinDataPoint, HalvingData } from "../../../types";
import type { ModelsValues } from "../models/values";

/** main: src/contexts/model.tsx `simulationSeed` (G12 source test re-reads it). */
export const SIMULATION_SEED = 1;
/** main: src/contexts/drawdown.tsx default inflation (unused until Plans). */
export const DEFAULT_INFLATION = 8;

export type WorldInputs = {
  currentPrice: number;
  currentBlock: number;
  halvings: HalvingData;
  interim: BitcoinDataPoint[];
  now: number;
};

/**
 * The engine gets its first config only once a real current price and block height have landed
 * (finite and above zero). Before that, its "Current Price/Block Not Zero" gate would only throw
 * and log; the chart shows its empty state meanwhile (§1h). The engine itself is unchanged.
 */
export const inputsReady = (inputs: Pick<WorldInputs, "currentPrice" | "currentBlock">): boolean =>
  Number.isFinite(inputs.currentPrice) &&
  inputs.currentPrice > 0 &&
  Number.isFinite(inputs.currentBlock) &&
  inputs.currentBlock > 0;

/** null when a value the engine needs is not one of its names (never, with the G12 schema). */
/** §2A: `showHistoric` is the Models pane's "Show historic price" tick (off by default). */
export const engineConfig = (
  values: ModelsValues,
  inputs: WorldInputs,
  showHistoric = false,
): EngineConfig | null => {
  const { model, walk } = values;
  if (!isModelName(model) || !isWalk(walk)) return null;
  return {
    currentBlock: inputs.currentBlock,
    currentPrice: inputs.currentPrice,
    epochs: values.epochCount,
    halvings: inputs.halvings,
    inflation: { annualPercent: DEFAULT_INFLATION, mode: "constant" },
    interim: inputs.interim,
    now: inputs.now,
    render: {
      renderDrawdownDistribution: "None",
      renderDrawdownWalks: false,
      renderModelMax: false,
      renderModelMin: false,
      renderPriceDistribution: "Quantile",
      renderPriceWalks: false,
      samplesToRender: 0,
      showHistoric,
    },
    samples: values.samples,
    scenario: {
      clampBottom: values.clampBottom,
      clampTop: values.clampTop,
      minMaxMultiple: values.minMaxMultiple,
      model,
      oneOffFiatVariables: [],
      oneOffItems: [],
      reoccurringItems: [],
      showModel: false,
      variable: values.variable,
      volatility: values.volatility,
      walk,
    },
    seed: SIMULATION_SEED,
    stack: { bitcoin: 0 },
  };
};
