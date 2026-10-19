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

/** null when a value the engine needs is not one of its names (never, with the G12 schema). */
export const engineConfig = (values: ModelsValues, inputs: WorldInputs): EngineConfig | null => {
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
      showHistoric: false,
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
