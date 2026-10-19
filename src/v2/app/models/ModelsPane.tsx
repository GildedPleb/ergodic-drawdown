import type { ChangeEvent, CSSProperties, JSX } from "react";
import { useMemo, useState } from "react";

import { LabelGlyphs } from "../../design/primitives/LabelGlyphs";
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

export type ModelsPaneProps = {
  /** Controlled values; omit for uncontrolled defaults from G12 schema. */
  value?: ModelsPaneValues;
  onChange?: (next: ModelsPaneValues) => void;
};

/** Models pane — same names, options, ranges and defaults as the live app (G12). */
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
  const select = styles["select"] ?? "models-select";
  const input = styles["input"] ?? "models-input";
  const options = styles["options"] ?? "models-options";
  const hint = styles["hint"] ?? "models-hint";

  const onModel = (event: ChangeEvent<HTMLSelectElement>): void => {
    const name = event.target.value;
    const meta = modelsPaneSchema.models.find((m) => m.name === name);
    const patch: Partial<ModelsPaneValues> = { model: name };
    if (meta !== undefined && meta.varInput !== "") {
      patch.variable = meta.default;
    }
    set(patch);
  };

  const onWalk = (event: ChangeEvent<HTMLSelectElement>): void => {
    set({ walk: event.target.value });
  };

  const years = values.epochCount * 4;

  const style = { ["--dyn-input-w" as string]: "4.5rem" } satisfies CSSProperties;

  return (
    <section className={root} style={style} aria-label="Model">
      <h2 className={title}>Model</h2>

      <div className={row}>
        <select
          className={select}
          id="v2-model"
          aria-label="Price model"
          value={values.model}
          onChange={onModel}
        >
          {modelsPaneSchema.modelOrder.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className={options}>
          {showVariable ? (
            <>
              <label className={label} htmlFor="v2-variable">
                {modelMeta?.varInput}
              </label>
              <input
                className={input}
                id="v2-variable"
                type="number"
                step={modelsPaneSchema.controls.variable.step}
                min={modelMeta?.rangeMin === "Infinity" ? undefined : modelMeta?.rangeMin}
                max={modelMeta?.rangeMax === "Infinity" ? undefined : modelMeta?.rangeMax}
                value={values.variable}
                onChange={(e) => {
                  set({ variable: Number.parseFloat(e.target.value) });
                }}
              />
            </>
          ) : null}
          {showMinMax ? (
            <>
              <label className={label} htmlFor="v2-minmax">
                +/-
              </label>
              <input
                className={input}
                id="v2-minmax"
                type="number"
                step={modelsPaneSchema.controls.minMaxMultiple.step}
                min={modelsPaneSchema.controls.minMaxMultiple.min}
                value={values.minMaxMultiple}
                onChange={(e) => {
                  const n = Number.parseFloat(e.target.value);
                  set({
                    minMaxMultiple:
                      n < modelsPaneSchema.controls.minMaxMultiple.min
                        ? modelsPaneSchema.controls.minMaxMultiple.min
                        : n,
                  });
                }}
              />
            </>
          ) : null}
        </div>
      </div>

      <div className={row}>
        <label className={label} htmlFor="v2-walk">
          Walk Strategy:
        </label>
        <select className={select} id="v2-walk" value={values.walk} onChange={onWalk}>
          {modelsPaneSchema.walks.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {values.walk === "🟢🟢🟢🔴" ? (
        <div className={row} aria-hidden="true">
          <LabelGlyphs text="🟢🟢🟢🔴" />
        </div>
      ) : null}

      <div className={row}>
        <span className={label}>{modelsPaneSchema.controls.clamp.label}</span>
        <div className={options}>
          <TickToggle
            label={modelsPaneSchema.controls.clamp.topLabel}
            checked={values.clampTop}
            onChange={(next) => {
              set({ clampTop: next });
            }}
          />
          <TickToggle
            label={modelsPaneSchema.controls.clamp.bottomLabel}
            checked={values.clampBottom}
            onChange={(next) => {
              set({ clampBottom: next });
            }}
          />
        </div>
      </div>

      <div className={row}>
        <label className={label} htmlFor="v2-vol">
          {modelsPaneSchema.controls.volatility.label}
        </label>
        <input
          className={input}
          id="v2-vol"
          type="number"
          min={modelsPaneSchema.controls.volatility.min}
          max={modelsPaneSchema.controls.volatility.max}
          step={volStep}
          value={values.volatility}
          onChange={(e) => {
            set({ volatility: Number.parseFloat(e.target.value) });
          }}
        />
      </div>

      <div className={row}>
        <label className={label} htmlFor="v2-epochs">
          {modelsPaneSchema.controls.epochs.label}
        </label>
        <input
          className={input}
          id="v2-epochs"
          type="number"
          min={modelsPaneSchema.controls.epochs.min}
          max={modelsPaneSchema.controls.epochs.max}
          value={values.epochCount}
          onChange={(e) => {
            set({ epochCount: Number.parseInt(e.target.value, 10) });
          }}
        />
        <span className={hint}>{` (~${years} years)`}</span>
      </div>

      <div className={row}>
        <label className={label} htmlFor="v2-samples">
          {modelsPaneSchema.controls.samples.label}
        </label>
        <input
          className={input}
          id="v2-samples"
          type="number"
          min={modelsPaneSchema.controls.samples.min}
          max={modelsPaneSchema.controls.samples.max}
          value={values.samples}
          onChange={(e) => {
            set({ samples: Number.parseInt(e.target.value, 10) });
          }}
        />
      </div>
    </section>
  );
};
