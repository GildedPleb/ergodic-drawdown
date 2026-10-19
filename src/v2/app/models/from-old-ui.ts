/**
 * Read-only projection of the current app's Models pane option set / defaults.
 * Sources: src/data/models, src/data/walks, src/constants, src/content,
 * plus control attributes from src/components/input/{model,walk,volatility,clamp,samples,epoch}.tsx
 * and defaults from src/contexts/model.tsx. No engine or old-UI mutation.
 * Literals that main keeps inline in components (steps, accept ranges, emptyValue, defaults,
 * the default walk) are re-read from main's source by test/v2/old-ui-source.test.ts, so a change
 * on main fails the suite instead of drifting silently.
 */
import {
  DEFAULT_EPOCH_COUNT,
  DEFAULT_SIMULATION_COUNT,
  MAX_EPOCH_COUNT,
  MAX_SAMPLE_COUNT,
} from "../../../constants";
import { fieldLabels, inputLabels } from "../../../content";
import { models } from "../../../data/models";
import { walks } from "../../../data/walks";

const jsonInfinity = (n: number): number | "Infinity" => (Number.isFinite(n) ? n : "Infinity");

/** main's acceptance for a settled field (useSettledNumber): accept min ≤ n ≤ max. */
type Accept = { min: number; max: number };

export type ModelsPaneSnapshot = {
  version: 1;
  /** Pane title (fieldLabels.model); the model select is labelled by it (m4). */
  title: string;
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
    /** Live filter: keystrokes outside the model's rangeMin…rangeMax are ignored (model.tsx). */
    variable: { step: number; default: number; parse: "float"; rule: "live-range" };
    /** Live floor: n < floor commits floor (model.tsx). */
    minMaxMultiple: {
      min: number;
      step: number;
      default: number;
      floor: number;
      parse: "float";
      rule: "live-floor";
    };
    walk: { label: string };
    volatility: {
      accept: Accept;
      emptyValue: number | null;
      parse: "float";
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
      accept: Accept;
      emptyValue: number | null;
      parse: "int";
      min: number;
      max: number;
      default: number;
      label: string;
    };
    epochs: {
      accept: Accept;
      emptyValue: number | null;
      parse: "int";
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
    title: fieldLabels.model,
    models: modelRows,
    modelOrder: modelRows.map((m) => m.name),
    defaultModel: modelRows[0]?.name ?? "",
    walks: Object.keys(walks),
    defaultWalk: "Bubble",
    controls: {
      variable: { step: 1, default: 0, parse: "float", rule: "live-range" },
      minMaxMultiple: {
        min: 1.01,
        step: 0.1,
        default: 3,
        floor: 1.01,
        parse: "float",
        rule: "live-floor",
      },
      walk: { label: inputLabels.walk },
      volatility: {
        accept: { min: 0, max: 1 },
        emptyValue: null,
        parse: "float",
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
        accept: { min: 0, max: MAX_SAMPLE_COUNT },
        emptyValue: 1000,
        parse: "int",
        min: 1,
        max: MAX_SAMPLE_COUNT,
        default: DEFAULT_SIMULATION_COUNT,
        label: inputLabels.samples,
      },
      epochs: {
        accept: { min: 1, max: 100 },
        emptyValue: null,
        parse: "int",
        min: 1,
        max: MAX_EPOCH_COUNT,
        default: DEFAULT_EPOCH_COUNT,
        label: inputLabels.epoch,
      },
    },
  };
};
