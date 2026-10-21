import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import { AssetRow } from "../../design/primitives/AssetRow";
import { spokenLabel } from "../../design/primitives/LabelGlyphs";
import { LedgerRow } from "../../design/primitives/LedgerRow";
import { NumberField } from "../../design/primitives/NumberField";
import type { Bounds } from "../../design/primitives/NumberField";
import { VisuallyHidden } from "../../design/primitives/VisuallyHidden";
import { SectionLabel } from "../../design/primitives/SectionLabel";
import { Select } from "../../design/primitives/Select";
import { Slider } from "../../design/primitives/Slider";
import { focusScale } from "../../design/primitives/Slider/scale";
import { TickToggle } from "../../design/primitives/TickToggle";
import { strings } from "../strings";
import styles from "./ModelsSheet.module.css";
import { closeOnPress } from "./outside";
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
 * Gap 10 (Form, m2): samples clamp to a minimum of 1 (zero futures draws nothing, so it is never a
 * valid result). 1 is main's own samples input `min` (G12 snapshot); the max is its accept max.
 */
export const SAMPLE_BOUNDS = {
  min: controls.samples.min,
  max: controls.samples.accept.max,
};
/** The samples label names the range the field really takes (from SAMPLE_BOUNDS, not a literal). */
export const SAMPLES_LABEL = strings.fields.samplesLabel(SAMPLE_BOUNDS.min, SAMPLE_BOUNDS.max);

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
  /** §1Q: the soft top for a field in the focus-range table (the model's rangeMax). */
  softTop?: number | undefined;
  onCommit: (n: number) => void;
};

/**
 * One live field (§1P): the NumberField (Probe gate) as the value cell, plus a slider when both
 * bounds are finite or the field has a focus range (§1Q).
 */
const Editor = (p: EditorProps): JSX.Element => {
  const focus = strings.fields.focus[p.label];
  const scale =
    focus === undefined || p.softTop === undefined
      ? undefined
      : focusScale(p.bounds.min, { ...focus, softTop: p.softTop });
  const finite = Number.isFinite(p.bounds.min) && Number.isFinite(p.bounds.max);
  const slide = styles["slide"] ?? "models-slide";
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
      {p.slider && (finite || scale !== undefined) ? (
        <div className={slide}>
          <Slider
            label={p.label}
            value={p.value}
            min={p.bounds.min}
            max={p.bounds.max}
            step={focus?.step ?? p.step}
            scale={scale}
            marks={focus?.marks.map((value) =>
              value === focus.labelled ? { value, label: count(value) } : { value },
            )}
            valueText={focus?.spoken}
            onCommit={p.onCommit}
          />
        </div>
      ) : null}
    </>
  );
};

export type ModelsSheetProps = {
  values: ModelsValues;
  onChange: (patch: Partial<ModelsValues>) => void;
  /** §1M: Bitcoin's ledger tick box (shown on the chart). */
  on?: boolean;
  onOn?: (next: boolean) => void;
  /** §2A: "Show historic price" (render.showHistoric), off by default. */
  historic?: boolean;
  onHistoric?: (next: boolean) => void;
  /** main's live Years cap (maxYears of the weeks since the last halving); the absolute cap before halvings load. */
  yearsMax?: number;
  /** Stories and tests: the row open on first render. */
  initialOpen?: string | null;
};

type AssetId = (typeof strings.models.assets)[number]["id"];

/** §1V: "CAGR 28% · Bubble · 1,000 futures": a percent variable joins its model's name. */
export const summaryOf = (values: ModelsValues): string => {
  const meta = modelsPaneSchema.models.find((m) => m.name === values.model);
  const model =
    meta?.varInput.includes("(%)") === true
      ? strings.models.percent(values.model, values.variable)
      : values.model;
  return strings.models.summary(model, values.walk, values.samples);
};

/**
 * The v32 Models pane: every back-end setting in Certificate controls, in the back end's own words (§1f); a field that exists only because of a Select's
 * choice lives in that Select's tray (§1N). Rows a model hides are removed, never disabled.
 */
export const ModelsSheet = ({
  values,
  onChange,
  on = true,
  onOn,
  historic = false,
  onHistoric,
  initialOpen = null,
  yearsMax = controls.years.max,
}: ModelsSheetProps): JSX.Element => {
  const [open, setOpen] = useState<string | null>(initialOpen);
  const ledgerRef = useRef<HTMLDivElement>(null);
  // §1V: a press anywhere in the sheet outside the ledger closes the open row (settings already
  // applied). A press on another row's header is that header's own click (it switches rows), so
  // nothing moves under the pointer between its press and its click.
  useEffect(() => {
    if (open === null) return undefined;
    return closeOnPress(
      document,
      (target) => {
        const list = ledgerRef.current;
        if (list === null || !(target instanceof Node)) return false;
        return (list.closest("section") ?? list).contains(target) && !list.contains(target);
      },
      () => {
        setOpen(null);
      },
    );
  }, [open]);
  const meta = modelsPaneSchema.models.find((m) => m.name === values.model);
  // §1Q (Rule 0, Form): R (%) accepts 0 to ∞; only the slider's mapping is front end. The model's
  // rangeMax (G12-mirrored) is the slider's soft top, not a clamp.
  const varBounds: Bounds = {
    min: meta === undefined || meta.rangeMin === "Infinity" ? 0 : meta.rangeMin,
    max: Infinity,
  };
  const softTop = meta === undefined || meta.rangeMax === "Infinity" ? undefined : meta.rangeMax;
  const volStep =
    values.walk === "Bubble" ? controls.volatility.stepBubble : controls.volatility.stepOther;

  const root = styles["root"] ?? "models-root";
  const section = styles["section"] ?? "models-section";
  const group = styles["group"] ?? "models-group";

  const variableRow =
    meta?.showVariable === true ? (
      <LedgerRow key={values.model} id="row-variable" label={meta.varInput} htmlFor="v2-variable">
        <Editor
          id="v2-variable"
          label={meta.varInput}
          value={values.variable}
          bounds={varBounds}
          parse={controls.variable.parse}
          step={controls.variable.step}
          emptyValue={null}
          who={noun(meta.varInput)}
          softTop={softTop}
          slider
          onCommit={(variable) => {
            onChange({ variable });
          }}
        />
      </LedgerRow>
    ) : null;

  const minMaxRow =
    meta?.showMinMaxMultiple === true ? (
      <LedgerRow id="row-minmax" label="+/-" htmlFor="v2-minmax">
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

  const modelTray =
    variableRow === null && minMaxRow === null ? undefined : (
      <>
        {variableRow}
        {minMaxRow}
      </>
    );

  const walkTray = (
    <>
      <LedgerRow id="row-volatility" label={controls.volatility.label} htmlFor="v2-vol">
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
    </>
  );

  const rows = strings.models.assets.map(({ id, name }: { id: AssetId; name: string }) => {
    const bitcoin = id === "bitcoin";
    return (
      <AssetRow
        key={id}
        id={`asset-${id}`}
        asset={id}
        name={name}
        openName={bitcoin ? strings.models.openName(name) : undefined}
        summary={bitcoin ? summaryOf(values) : strings.models.notYet}
        open={open === id}
        dim={open !== null && open !== id}
        onToggle={(next) => {
          setOpen(next ? id : null);
        }}
        tick={
          bitcoin
            ? { on, label: strings.models.showOn(name), onChange: (next) => onOn?.(next) }
            : undefined
        }
      >
        {bitcoin ? (
          <>
            {/* §2A: directly under the asset's headline, the existing tick box only. */}
            <TickToggle
              label={strings.models.showHistoric}
              stateWord={false}
              checked={historic}
              onChange={(next) => onHistoric?.(next)}
            />
            <div className={section} role="group" aria-labelledby="grp-price-model">
              <SectionLabel text={strings.sections.priceModel} level="group" id="grp-price-model" />
              <Select
                id="v2-model"
                labelledBy="grp-price-model"
                options={modelsPaneSchema.modelOrder}
                value={values.model}
                onChange={(choice) => {
                  onChange(choosePatch(choice));
                }}
                tray={modelTray}
                trayLabel={strings.models.settings(values.model)}
              />
            </div>
            <div className={section} role="group" aria-labelledby="grp-prices-move">
              <SectionLabel text={strings.sections.pricesMove} level="group" id="grp-prices-move" />
              {/* §1M: the engine's label names the walk Select; no duplicate header. */}
              <VisuallyHidden id="lbl-walk">{controls.walk.label}</VisuallyHidden>
              <Select
                id="v2-walk"
                labelledBy="lbl-walk"
                options={modelsPaneSchema.walks}
                value={values.walk}
                onChange={(walk) => {
                  onChange({ walk });
                }}
                tray={walkTray}
                trayLabel={strings.models.settings(spokenLabel(values.walk))}
              />
            </div>
            <div className={section} role="group" aria-labelledby="grp-simulation">
              <SectionLabel text={strings.sections.simulation} level="group" id="grp-simulation" />
              <LedgerRow id="row-samples" label={SAMPLES_LABEL} htmlFor="v2-samples">
                <Editor
                  id="v2-samples"
                  label={SAMPLES_LABEL}
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
              <LedgerRow id="row-years" label={strings.fields.yearsLabel} htmlFor="v2-years">
                <Editor
                  id="v2-years"
                  label={strings.fields.yearsLabel}
                  value={values.years}
                  bounds={{ min: controls.years.min, max: yearsMax }}
                  parse={controls.years.parse}
                  step={1}
                  emptyValue={controls.years.emptyValue}
                  who={strings.fields.nouns.years}
                  slider
                  onCommit={(years) => {
                    onChange({ years });
                  }}
                />
              </LedgerRow>
            </div>
          </>
        ) : (
          <p>{strings.models.standIn(name)}</p>
        )}
      </AssetRow>
    );
  });

  return (
    <div className={root}>
      {/* Form m1: no visible pane title; the sheet keeps its h2 for headings navigation. */}
      <VisuallyHidden as="h2">{modelsPaneSchema.title}</VisuallyHidden>
      <div ref={ledgerRef} role="list" aria-label={strings.models.label}>
        {rows}
      </div>
    </div>
  );
};
