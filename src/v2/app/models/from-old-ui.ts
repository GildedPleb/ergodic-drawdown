/**
 * Read-only projection of the current app's Models pane option set / defaults.
 * Sources: src/data/models, src/data/walks, src/constants, src/content,
 * plus control attributes from src/components/input/{model,walk,volatility,clamp,samples,epoch}.tsx
 * and defaults from src/contexts/model.tsx. No engine or old-UI mutation.
 */
import {
  DEFAULT_EPOCH_COUNT,
  DEFAULT_SIMULATION_COUNT,
  MAX_EPOCH_COUNT,
  MAX_SAMPLE_COUNT,
} from "../../../constants";
import { inputLabels } from "../../../content";
import { models } from "../../../data/models";
import { walks } from "../../../data/walks";

const jsonInfinity = (n: number): number | "Infinity" => (Number.isFinite(n) ? n : "Infinity");

export type ModelsPaneSnapshot = {
  version: 1;
  models: Array<{
    name: string;
    default: number;
    rangeMin: number | "Infinity";
    rangeMax: number | "Infinity";
    varInput: string;
    varRange: boolean;
    showVariable: boolean;
    showMinMaxMultiple: boolean;
  }>;
  modelOrder: string[];
  defaultModel: string;
  walks: string[];
  defaultWalk: string;
  controls: {
    variable: { step: number; default: number };
    minMaxMultiple: { min: number; step: number; default: number };
    volatility: {
      min: number;
      max: number;
      default: number;
      stepBubble: number;
      stepOther: number;
      label: string;
    };
    clamp: {
      topDefault: boolean;
      bottomDefault: boolean;
      label: string;
      topLabel: string;
      bottomLabel: string;
    };
    samples: {
      min: number;
      max: number;
      default: number;
      label: string;
    };
    epochs: {
      min: number;
      max: number;
      default: number;
      label: string;
    };
  };
};

export const buildOldUiModelsSnapshot = (): ModelsPaneSnapshot => {
  const modelRows = models.map((m) => ({
    name: m.modelType,
    default: m.default,
    rangeMin: jsonInfinity(m.rangeMin),
    rangeMax: jsonInfinity(m.rangeMax),
    varInput: m.varInput,
    varRange: m.varRange,
    showVariable: m.varInput !== "",
    showMinMaxMultiple: m.varRange,
  }));

  return {
    version: 1,
    models: modelRows,
    modelOrder: modelRows.map((m) => m.name),
    defaultModel: modelRows[0]?.name ?? "",
    walks: Object.keys(walks),
    defaultWalk: "Bubble",
    controls: {
      variable: { step: 1, default: 0 },
      minMaxMultiple: { min: 1.01, step: 0.1, default: 3 },
      volatility: {
        min: 0,
        max: 1,
        default: 0.1,
        stepBubble: 0.005,
        stepOther: 0.001,
        label: inputLabels.vol,
      },
      clamp: {
        topDefault: false,
        bottomDefault: false,
        label: inputLabels.clamp,
        topLabel: inputLabels.clampTop,
        bottomLabel: inputLabels.clampBottom,
      },
      samples: {
        min: 1,
        max: MAX_SAMPLE_COUNT,
        default: DEFAULT_SIMULATION_COUNT,
        label: inputLabels.samples,
      },
      epochs: {
        min: 1,
        max: MAX_EPOCH_COUNT,
        default: DEFAULT_EPOCH_COUNT,
        label: inputLabels.epoch,
      },
    },
  };
};
