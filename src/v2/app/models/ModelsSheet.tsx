import type { JSX } from "react";
import { MAX_EPOCH_COUNT } from "../../../constants";
import { useState } from "react";

import { LedgerRow } from "../../design/primitives/LedgerRow";
import { NumberField } from "../../design/primitives/NumberField";
import type { Bounds } from "../../design/primitives/NumberField";
import { RadioList } from "../../design/primitives/RadioList";
import { VisuallyHidden } from "../../design/primitives/VisuallyHidden";
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
 * MAX_EPOCH_COUNT and a larger count fails the simulation. Clamp to what the engine runs.
 */
const EPOCH_BOUNDS = { min: controls.epochs.accept.min, max: MAX_EPOCH_COUNT };
/**
 * Gap 10 (Form, m2): samples clamp to a minimum of 1 (zero futures draws nothing, so it is never a
 * valid result). 1 is main's own samples input `min` (G12 snapshot); the max is its accept max.
 */
export const SAMPLE_BOUNDS = { min: controls.samples.min, max: controls.samples.accept.max };

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

/** R7: variant keys and values. */
export const variants = {
  layout: ["stack", "columns"] as const,
  /** "space": reserve a group sub-label's room under the section label (desktop columns). */
  sub: ["space", "none"] as const,
};

export type ModelsSheetProps = {
  /** Desktop (Form M2): the three sections side by side, each scrolling on its own. */
  layout?: (typeof variants.layout)[number];
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
  layout = "stack",
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

  // Form follow-up 3: in columns, Price model and Simulation leave WALK STRATEGY's room so all
  // three first rows share one line.
  const reserve: (typeof variants.sub)[number] = layout === "columns" ? "space" : "none";

  return (
    <div className={root} data-layout={layout}>
      {/* Form m1: no visible pane title; the sheet keeps its h2 for headings navigation. */}
      <VisuallyHidden as="h2">{modelsPaneSchema.title}</VisuallyHidden>

      <section className={section} data-sub={reserve} aria-labelledby="sec-price-model">
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

      <section className={section} data-sub="none" aria-labelledby="sec-prices-move">
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

      <section className={section} data-sub={reserve} aria-labelledby="sec-simulation">
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
            bounds={SAMPLE_BOUNDS}
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
