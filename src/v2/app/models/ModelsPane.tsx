import type { JSX } from "react";
import { useMemo, useState } from "react";

import { NumberField, type NumberRule } from "../../design/primitives/NumberField";
import { SectionLabel } from "../../design/primitives/SectionLabel";
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

const { controls } = modelsPaneSchema;

const defaultsFromSchema = (): ModelsPaneValues => ({
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

/** Old-UI "Infinity" bounds mean no bound. */
const bound = (v: number | string | undefined): number | undefined =>
  v === undefined || v === "Infinity" || v === "-Infinity" ? undefined : Number(v);

/** main's useSettledNumber acceptance, from the G12 schema (B3). */
const settle = (accept: { min: number; max: number }, emptyValue: number | null): NumberRule => ({
  kind: "settle",
  accept: (n) => n >= accept.min && n <= accept.max,
  emptyValue,
});

const VOL_RULE = settle(controls.volatility.accept, controls.volatility.emptyValue);
const EPOCH_RULE = settle(controls.epochs.accept, controls.epochs.emptyValue);
const SAMPLE_RULE = settle(controls.samples.accept, controls.samples.emptyValue);
/** main's +/-: below the floor commits the floor; anything else (NaN included) commits as typed. */
const MINMAX_RULE: NumberRule = {
  kind: "live",
  apply: (n) => (n < controls.minMaxMultiple.floor ? controls.minMaxMultiple.floor : n),
};

const int = (n: number): string => n.toLocaleString("en-US");

/** M2 copy: cause → next step → reassurance. */
const volError = (current: number): string =>
  `Volatility goes from ${controls.volatility.accept.min} to ${controls.volatility.accept.max}. Enter a number in that range. Your last value, ${current}, is still in use.`;
const epochError = (current: number): string =>
  `Epochs take a whole number from ${int(controls.epochs.accept.min)} to ${int(controls.epochs.accept.max)}. Enter one in that range. Your last value, ${current}, is still in use.`;
const sampleError = (current: number): string =>
  `Samples take a whole number from ${int(controls.samples.accept.min)} to ${int(controls.samples.accept.max)}. Enter one in that range. Your last value, ${int(current)}, is still in use.`;

/** The pane's error copy (tests check every string against the SM cmaps, m2). */
export const MODELS_PANE_ERRORS = {
  volatility: volError,
  epochs: epochError,
  samples: sampleError,
} as const;

export type ModelsPaneProps = {
  /** Controlled values; omit for uncontrolled defaults from the G12 schema. */
  value?: ModelsPaneValues;
  /** Uncontrolled starting values layered over the schema defaults (stories). */
  initial?: Partial<ModelsPaneValues>;
  onChange?: (next: ModelsPaneValues) => void;
};

/**
 * Models pane: same names, options, order, ranges, steps, acceptance and defaults as the live app
 * (G12, B3). Feature code composes design primitives only; no raw <select>/<input> (G4).
 */
export const ModelsPane = ({ value, initial, onChange }: ModelsPaneProps): JSX.Element => {
  const [internal, setInternal] = useState<ModelsPaneValues>(() => ({
    ...defaultsFromSchema(),
    ...initial,
  }));
  const values = value ?? internal;
  const headingId = "v2-models-title";
  const clampId = "v2-clamp-label";

  const set = (patch: Partial<ModelsPaneValues>): void => {
    const next = { ...values, ...patch };
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const modelMeta = useMemo(
    () => modelsPaneSchema.models.find((m) => m.name === values.model),
    [values.model],
  );
  const rangeMin = bound(modelMeta?.rangeMin);
  const rangeMax = bound(modelMeta?.rangeMax);
  /** main's model variable: keystrokes outside rangeMin…rangeMax are ignored. */
  const variableRule = useMemo<NumberRule>(
    () => ({
      kind: "live",
      apply: (n) =>
        n <= (rangeMax ?? Number.POSITIVE_INFINITY) && n >= (rangeMin ?? Number.NEGATIVE_INFINITY)
          ? n
          : undefined,
    }),
    [rangeMin, rangeMax],
  );

  const showVariable = modelMeta?.showVariable === true;
  const showMinMax = modelMeta?.showMinMaxMultiple === true;
  const volStep =
    values.walk === "Bubble" ? controls.volatility.stepBubble : controls.volatility.stepOther;

  const root = styles["root"] ?? "models-root";
  const fields = styles["fields"] ?? "models-fields";
  const group = styles["group"] ?? "models-group";
  const groupLabel = styles["groupLabel"] ?? "models-group-label";
  const options = styles["options"] ?? "models-options";

  const onModel = (name: string): void => {
    const meta = modelsPaneSchema.models.find((m) => m.name === name);
    const patch: Partial<ModelsPaneValues> = { model: name };
    if (meta !== undefined && meta.varInput !== "") {
      patch.variable = meta.default;
    }
    set(patch);
  };

  const years = values.epochCount * 4;

  return (
    <section className={root} aria-labelledby={headingId}>
      <SectionLabel text={modelsPaneSchema.title} id={headingId} />

      <div className={fields}>
        <Select
          id="v2-model"
          labelledBy={headingId}
          options={modelsPaneSchema.modelOrder}
          value={values.model}
          onChange={onModel}
        />
        {showVariable ? (
          <NumberField
            // Form N1: a new model is a new field (draft reset, as main's setVariable(default)).
            key={values.model}
            id="v2-variable"
            label={modelMeta?.varInput ?? ""}
            step={controls.variable.step}
            min={rangeMin}
            max={rangeMax}
            rule={variableRule}
            parse={controls.variable.parse}
            value={values.variable}
            onCommit={(n) => {
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
            rule={MINMAX_RULE}
            parse={controls.minMaxMultiple.parse}
            value={values.minMaxMultiple}
            onCommit={(n) => {
              set({ minMaxMultiple: n });
            }}
          />
        ) : null}

        <Select
          id="v2-walk"
          label={controls.walk.label}
          options={modelsPaneSchema.walks}
          value={values.walk}
          onChange={(walk) => {
            set({ walk });
          }}
        />

        <div className={group} role="group" aria-labelledby={clampId}>
          <span className={groupLabel} id={clampId}>
            {controls.clamp.label}
          </span>
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

        <NumberField
          id="v2-vol"
          label={controls.volatility.label}
          min={controls.volatility.min}
          max={controls.volatility.max}
          step={volStep}
          rule={VOL_RULE}
          parse={controls.volatility.parse}
          error={volError}
          value={values.volatility}
          onCommit={(n) => {
            set({ volatility: n });
          }}
        />

        <NumberField
          id="v2-epochs"
          label={controls.epochs.label}
          min={controls.epochs.min}
          max={controls.epochs.max}
          step={1}
          rule={EPOCH_RULE}
          parse={controls.epochs.parse}
          error={epochError}
          hint={`(~${years} years)`}
          value={values.epochCount}
          onCommit={(n) => {
            set({ epochCount: n });
          }}
        />

        <NumberField
          id="v2-samples"
          label={controls.samples.label}
          min={controls.samples.min}
          max={controls.samples.max}
          step={1}
          rule={SAMPLE_RULE}
          parse={controls.samples.parse}
          error={sampleError}
          value={values.samples}
          onCommit={(n) => {
            set({ samples: n });
          }}
        />
      </div>
    </section>
  );
};
