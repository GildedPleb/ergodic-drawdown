import type { JSX } from "react";
import { useState } from "react";

import { LedgerRow } from "../../design/primitives/LedgerRow";
import { NumberField } from "../../design/primitives/NumberField";
import type { Bounds } from "../../design/primitives/NumberField";
import { RadioList } from "../../design/primitives/RadioList";
import { SectionLabel } from "../../design/primitives/SectionLabel";
import { Slider } from "../../design/primitives/Slider";
import { TickToggle } from "../../design/primitives/TickToggle";
import { strings } from "../strings";
import styles from "./ModelsSheet.module.css";
import { modelsPaneSchema } from "./schema";
import { choosePatch, type ModelsValues } from "./values";

const { controls } = modelsPaneSchema;
const count = (n: number): string => n.toLocaleString("en-US");
/** "Previous Halvings" → plural, "R (%)" → singular (for "goes" / "go"). */
const noun = (name: string): { name: string; plural: boolean } => ({
  name,
  plural: name.endsWith("s"),
});

/**
 * Gap 10 (Rule 0): the old input accepted 1–100, but the engine's buffers stop at
 * MAX_EPOCH_COUNT (controls.epochs.max = 30) and a larger count fails the simulation. Clamp to
 * what the engine runs.
 */
const EPOCH_BOUNDS = { min: controls.epochs.accept.min, max: controls.epochs.max };

export type Field = "variable" | "minMaxMultiple" | "volatility" | "samples" | "epochs";

type EditorProps = {
  id: string;
  label: string;
  value: number;
  bounds: Bounds;
  parse: "float" | "int";
  step: number;
  emptyValue: number | null;
  who: { name: string; plural: boolean };
  slider: boolean;
  hint?: string | undefined;
  onCommit: (n: number) => void;
};

/** The in-place editor: the NumberField (Probe gate) plus a slider when both bounds are finite. */
const Editor = (p: EditorProps): JSX.Element => {
  const finite = Number.isFinite(p.bounds.min) && Number.isFinite(p.bounds.max);
  return (
    <>
      <NumberField
        id={p.id}
        label={p.label}
        labelHidden
        value={p.value}
        bounds={p.bounds}
        parse={p.parse}
        step={p.step}
        emptyValue={p.emptyValue}
        hint={p.hint}
        clampMessage={(used, b) => strings.fields.clamped(p.who, b.min, b.max, used)}
        invalidMessage={(current) =>
          strings.fields.invalid(p.who, p.parse, p.bounds.min, p.bounds.max, current)
        }
        onCommit={p.onCommit}
      />
      {p.slider && finite ? (
        <Slider
          label={p.label}
          value={p.value}
          min={p.bounds.min}
          max={p.bounds.max}
          step={p.step}
          onCommit={p.onCommit}
        />
      ) : null}
    </>
  );
};

export type ModelsSheetProps = {
  values: ModelsValues;
  onChange: (patch: Partial<ModelsValues>) => void;
  /** Stories and tests: a row whose editor starts open. */
  initialEditing?: Field | undefined;
};

/**
 * The v32 Models sheet (V32-BUILD §1f): every back-end setting in Certificate controls, in the
 * back end's own words. Rows a model hides are removed, never disabled.
 */
export const ModelsSheet = ({
  values,
  onChange,
  initialEditing,
}: ModelsSheetProps): JSX.Element => {
  const [editing, setEditing] = useState<Field | null>(initialEditing ?? null);
  const toggle =
    (field: Field) =>
    (open: boolean): void => {
      setEditing(open ? field : null);
    };

  const meta = modelsPaneSchema.models.find((m) => m.name === values.model);
  const varBounds: Bounds = {
    min: meta === undefined || meta.rangeMin === "Infinity" ? 0 : meta.rangeMin,
    max: meta === undefined || meta.rangeMax === "Infinity" ? Infinity : meta.rangeMax,
  };
  const volStep =
    values.walk === "Bubble" ? controls.volatility.stepBubble : controls.volatility.stepOther;

  const root = styles["root"] ?? "models-root";
  const title = styles["title"] ?? "models-title";
  const section = styles["section"] ?? "models-section";
  const group = styles["group"] ?? "models-group";

  const variableRow =
    meta?.showVariable === true ? (
      <LedgerRow
        key={values.model}
        id="row-variable"
        label={meta.varInput}
        value={count(values.variable)}
        open={editing === "variable"}
        onToggle={toggle("variable")}
      >
        <Editor
          id="v2-variable"
          label={meta.varInput}
          value={values.variable}
          bounds={varBounds}
          parse={controls.variable.parse}
          step={controls.variable.step}
          emptyValue={null}
          who={noun(meta.varInput)}
          slider
          onCommit={(variable) => {
            onChange({ variable });
          }}
        />
      </LedgerRow>
    ) : null;

  const minMaxRow =
    meta?.showMinMaxMultiple === true ? (
      <LedgerRow
        id="row-minmax"
        label="+/-"
        value={count(values.minMaxMultiple)}
        open={editing === "minMaxMultiple"}
        onToggle={toggle("minMaxMultiple")}
      >
        <Editor
          id="v2-minmax"
          label="+/-"
          value={values.minMaxMultiple}
          bounds={{ min: controls.minMaxMultiple.floor, max: Infinity }}
          parse={controls.minMaxMultiple.parse}
          step={controls.minMaxMultiple.step}
          emptyValue={null}
          who={strings.fields.nouns.minMaxMultiple}
          slider={false}
          onCommit={(minMaxMultiple) => {
            onChange({ minMaxMultiple });
          }}
        />
      </LedgerRow>
    ) : null;

  return (
    <div className={root}>
      <h2 className={title}>{modelsPaneSchema.title}</h2>

      <section className={section} aria-labelledby="sec-price-model">
        <SectionLabel text={strings.sections.priceModel} as="h3" id="sec-price-model" />
        <RadioList
          labelledBy="sec-price-model"
          options={modelsPaneSchema.modelOrder}
          value={values.model}
          onChange={(name) => {
            setEditing(null);
            onChange(choosePatch(name));
          }}
        />
        {variableRow}
        {minMaxRow}
      </section>

      <section className={section} aria-labelledby="sec-prices-move">
        <SectionLabel text={strings.sections.pricesMove} as="h3" id="sec-prices-move" />
        <SectionLabel text={controls.walk.label} level="group" id="grp-walk" />
        <RadioList
          labelledBy="grp-walk"
          options={modelsPaneSchema.walks}
          value={values.walk}
          onChange={(walk) => {
            onChange({ walk });
          }}
        />
        <LedgerRow
          id="row-volatility"
          label={controls.volatility.label}
          value={String(values.volatility)}
          open={editing === "volatility"}
          onToggle={toggle("volatility")}
        >
          <Editor
            id="v2-vol"
            label={controls.volatility.label}
            value={values.volatility}
            bounds={controls.volatility.accept}
            parse={controls.volatility.parse}
            step={volStep}
            emptyValue={controls.volatility.emptyValue}
            who={strings.fields.nouns.volatility}
            slider
            onCommit={(volatility) => {
              onChange({ volatility });
            }}
          />
        </LedgerRow>
        <SectionLabel text={controls.clamp.label} level="group" id="grp-clamp" />
        <div className={group} role="group" aria-labelledby="grp-clamp">
          <TickToggle
            label={controls.clamp.topLabel}
            checked={values.clampTop}
            onChange={(clampTop) => {
              onChange({ clampTop });
            }}
          />
          <TickToggle
            label={controls.clamp.bottomLabel}
            checked={values.clampBottom}
            onChange={(clampBottom) => {
              onChange({ clampBottom });
            }}
          />
        </div>
      </section>

      <section className={section} aria-labelledby="sec-simulation">
        <SectionLabel text={strings.sections.simulation} as="h3" id="sec-simulation" />
        <LedgerRow
          id="row-samples"
          label={controls.samples.label}
          value={count(values.samples)}
          open={editing === "samples"}
          onToggle={toggle("samples")}
        >
          <Editor
            id="v2-samples"
            label={controls.samples.label}
            value={values.samples}
            bounds={controls.samples.accept}
            parse={controls.samples.parse}
            step={1}
            emptyValue={controls.samples.emptyValue}
            who={strings.fields.nouns.samples}
            slider={false}
            onCommit={(samples) => {
              onChange({ samples });
            }}
          />
        </LedgerRow>
        <LedgerRow
          id="row-epochs"
          label={controls.epochs.label}
          value={count(values.epochCount)}
          open={editing === "epochs"}
          onToggle={toggle("epochs")}
        >
          <Editor
            id="v2-epochs"
            label={controls.epochs.label}
            value={values.epochCount}
            bounds={EPOCH_BOUNDS}
            parse={controls.epochs.parse}
            step={1}
            emptyValue={controls.epochs.emptyValue}
            who={strings.fields.nouns.epochs}
            slider
            hint={strings.fields.years(values.epochCount * 4)}
            onCommit={(epochCount) => {
              onChange({ epochCount });
            }}
          />
        </LedgerRow>
      </section>
    </div>
  );
};
