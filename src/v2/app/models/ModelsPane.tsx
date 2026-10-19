import type { JSX } from "react";
import { useMemo, useState } from "react";

import { NumberField } from "../../design/primitives/NumberField";
import { Select } from "../../design/primitives/Select";
import { TickToggle } from "../../design/primitives/TickToggle";
import styles from "./ModelsPane.module.css";
import { modelsPaneSchema } from "./schema";

export type ModelsPaneValues = {
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

const defaultsFromSchema = (): ModelsPaneValues => ({
  model: modelsPaneSchema.defaultModel,
  variable: modelsPaneSchema.controls.variable.default,
  minMaxMultiple: modelsPaneSchema.controls.minMaxMultiple.default,
  walk: modelsPaneSchema.defaultWalk,
  volatility: modelsPaneSchema.controls.volatility.default,
  clampTop: modelsPaneSchema.controls.clamp.topDefault,
  clampBottom: modelsPaneSchema.controls.clamp.bottomDefault,
  samples: modelsPaneSchema.controls.samples.default,
  epochCount: modelsPaneSchema.controls.epochs.default,
});

/** Old-UI "Infinity" bounds mean no bound on the native control. */
const bound = (v: number | string | undefined): number | undefined =>
  v === undefined || v === "Infinity" || v === "-Infinity" ? undefined : Number(v);

export type ModelsPaneProps = {
  /** Controlled values; omit for uncontrolled defaults from G12 schema. */
  value?: ModelsPaneValues;
  onChange?: (next: ModelsPaneValues) => void;
};

/**
 * Models pane: same names, options, order, ranges, steps and defaults as the live app (G12).
 * Feature code composes design primitives only; no raw <select>/<input> (G4).
 */
export const ModelsPane = ({ value, onChange }: ModelsPaneProps): JSX.Element => {
  const [internal, setInternal] = useState<ModelsPaneValues>(defaultsFromSchema);
  const values = value ?? internal;

  const set = (patch: Partial<ModelsPaneValues>): void => {
    const next = { ...values, ...patch };
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const modelMeta = useMemo(
    () => modelsPaneSchema.models.find((m) => m.name === values.model),
    [values.model],
  );

  const showVariable = modelMeta?.showVariable === true;
  const showMinMax = modelMeta?.showMinMaxMultiple === true;
  const volStep =
    values.walk === "Bubble"
      ? modelsPaneSchema.controls.volatility.stepBubble
      : modelsPaneSchema.controls.volatility.stepOther;

  const root = styles["root"] ?? "models-root";
  const title = styles["title"] ?? "models-title";
  const row = styles["row"] ?? "models-row";
  const label = styles["label"] ?? "models-label";
  const options = styles["options"] ?? "models-options";
  const hint = styles["hint"] ?? "models-hint";

  const onModel = (name: string): void => {
    const meta = modelsPaneSchema.models.find((m) => m.name === name);
    const patch: Partial<ModelsPaneValues> = { model: name };
    if (meta !== undefined && meta.varInput !== "") {
      patch.variable = meta.default;
    }
    set(patch);
  };

  const years = values.epochCount * 4;
  const { controls } = modelsPaneSchema;

  return (
    <section className={root} aria-label="Model">
      <h2 className={title}>Model</h2>

      <div className={row}>
        <Select
          id="v2-model"
          label="Price model"
          labelVisibility="hidden"
          options={modelsPaneSchema.modelOrder}
          value={values.model}
          onChange={onModel}
        />
        <div className={options}>
          {showVariable ? (
            <NumberField
              id="v2-variable"
              label={modelMeta?.varInput ?? ""}
              step={controls.variable.step}
              min={bound(modelMeta?.rangeMin)}
              max={bound(modelMeta?.rangeMax)}
              value={values.variable}
              onChange={(n) => {
                set({ variable: n });
              }}
            />
          ) : null}
          {showMinMax ? (
            <NumberField
              id="v2-minmax"
              label="+/-"
              step={controls.minMaxMultiple.step}
              min={controls.minMaxMultiple.min}
              value={values.minMaxMultiple}
              onChange={(n) => {
                set({
                  minMaxMultiple: n < controls.minMaxMultiple.min ? controls.minMaxMultiple.min : n,
                });
              }}
            />
          ) : null}
        </div>
      </div>

      <div className={row}>
        <Select
          id="v2-walk"
          label="Walk Strategy:"
          options={modelsPaneSchema.walks}
          value={values.walk}
          onChange={(walk) => {
            set({ walk });
          }}
        />
      </div>

      <div className={row}>
        <span className={label}>{controls.clamp.label}</span>
        <div className={options}>
          <TickToggle
            label={controls.clamp.topLabel}
            checked={values.clampTop}
            onChange={(next) => {
              set({ clampTop: next });
            }}
          />
          <TickToggle
            label={controls.clamp.bottomLabel}
            checked={values.clampBottom}
            onChange={(next) => {
              set({ clampBottom: next });
            }}
          />
        </div>
      </div>

      <div className={row}>
        <NumberField
          id="v2-vol"
          label={controls.volatility.label}
          min={controls.volatility.min}
          max={controls.volatility.max}
          step={volStep}
          value={values.volatility}
          onChange={(n) => {
            set({ volatility: n });
          }}
        />
      </div>

      <div className={row}>
        <NumberField
          id="v2-epochs"
          label={controls.epochs.label}
          parse="int"
          min={controls.epochs.min}
          max={controls.epochs.max}
          value={values.epochCount}
          onChange={(n) => {
            set({ epochCount: n });
          }}
        />
        <span className={hint}>{` (~${years} years)`}</span>
      </div>

      <div className={row}>
        <NumberField
          id="v2-samples"
          label={controls.samples.label}
          parse="int"
          min={controls.samples.min}
          max={controls.samples.max}
          value={values.samples}
          onChange={(n) => {
            set({ samples: n });
          }}
        />
      </div>
    </section>
  );
};
