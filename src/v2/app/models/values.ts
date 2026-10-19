/**
 * Models sheet state: one value per back-end setting, defaults from the G12 schema.
 */
import { modelsPaneSchema } from "./schema";

export type ModelsValues = {
  model: string;
  variable: number;
  minMaxMultiple: number;
  walk: string;
  volatility: number;
  clampTop: boolean;
  clampBottom: boolean;
  samples: number;
  epochCount: number;
};

const { controls } = modelsPaneSchema;

export const defaultModelsValues = (): ModelsValues => ({
  model: modelsPaneSchema.defaultModel,
  variable: controls.variable.default,
  minMaxMultiple: controls.minMaxMultiple.default,
  walk: modelsPaneSchema.defaultWalk,
  volatility: controls.volatility.default,
  clampTop: controls.clamp.topDefault,
  clampBottom: controls.clamp.bottomDefault,
  samples: controls.samples.default,
  epochCount: controls.epochs.default,
});

/** main's setModel: a model with a variable resets it to that model's default. */
export const choosePatch = (name: string): Partial<ModelsValues> => {
  const meta = modelsPaneSchema.models.find((m) => m.name === name);
  return meta !== undefined && meta.varInput !== ""
    ? { model: name, variable: meta.default }
    : { model: name };
};
