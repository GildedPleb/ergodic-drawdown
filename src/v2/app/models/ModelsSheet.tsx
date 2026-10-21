import type { JSX } from "react";
import { useState } from "react";

import { AssetRow } from "../../design/primitives/AssetRow";
import { Icon } from "../../design/primitives/Icon";
import { LedgerRow } from "../../design/primitives/LedgerRow";
import { NumberField } from "../../design/primitives/NumberField";
import type { Bounds } from "../../design/primitives/NumberField";
import { DECIMAL_PLACES, shownAt } from "../../design/primitives/NumberField/entry";
import { SectionLabel } from "../../design/primitives/SectionLabel";
import { Select } from "../../design/primitives/Select";
import { Slider } from "../../design/primitives/Slider";
import { focusScale } from "../../design/primitives/Slider/scale";
import { Swatches } from "../../design/primitives/Swatches";
import { TickToggle } from "../../design/primitives/TickToggle";
import { VisuallyHidden } from "../../design/primitives/VisuallyHidden";
import { useMedia } from "../shell/useMedia";
import { colourOf, strings } from "../strings";
import styles from "./ModelsSheet.module.css";
import { modelsPaneSchema } from "./schema";
import { choosePatch, type ModelsValues } from "./values";

const { controls } = modelsPaneSchema;
const copy = strings.models;
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
/** §1MP 6: desktop, where the open walk list takes two columns (read here, inside the pane). */
const DESKTOP = "(min-width: 64rem)";

export const SAMPLE_BOUNDS = {
  min: controls.samples.min,
  max: controls.samples.accept.max,
};
/** The samples label names the range the field really takes (from SAMPLE_BOUNDS, not a literal). */
export const SAMPLES_LABEL = strings.fields.samplesLabel(SAMPLE_BOUNDS.min, SAMPLE_BOUNDS.max);

/** Form 2a: count fields take whole numbers; the percent and decimal fields (R, +/-) rest at 2. */
export const COUNT_FIELDS: readonly string[] = ["Previous Halvings"];
const DECIMAL_FIELDS: readonly string[] = ["R (%)", "+/-"];
/** A field's resting decimals, and (Form ruling) its one rest format wherever it's shown or spoken. */
export const placesOf = (label: string): number | undefined =>
  DECIMAL_FIELDS.includes(label) ? DECIMAL_PLACES : undefined;
export const restOf = (label: string): ((n: number) => string) => shownAt(placesOf(label));

type EditorProps = {
  /** The row is `row-{id}`; the input `v2-{input ?? id}`. */
  id: string;
  input?: string;
  label: string;
  value: number;
  bounds: Bounds;
  parse: "float" | "int";
  step: number;
  emptyValue: number | null;
  /** Form 2a: a count (whole numbers), or a decimal field resting at `places`. */
  whole?: boolean;
  places?: number | undefined;
  who: { name: string; plural: boolean };
  slider: boolean;
  description?: string | undefined;
  /** §1Q: the soft top for a field in the focus-range table (the model's rangeMax). */
  softTop?: number | undefined;
  onCommit: (n: number) => void;
};

/**
 * One setting row (§1MP 7) with its live field (§1P): the NumberField (Probe gate) as the value
 * cell, the description, and a slider on the next line when both bounds are finite or the field
 * has a focus range (§1Q).
 */
const Editor = (p: EditorProps): JSX.Element => {
  const focus = strings.fields.focus[p.label];
  const scale =
    focus === undefined || p.softTop === undefined
      ? undefined
      : focusScale(p.bounds.min, { ...focus, softTop: p.softTop });
  const finite = Number.isFinite(p.bounds.min) && Number.isFinite(p.bounds.max);
  return (
    <LedgerRow
      id={`row-${p.id}`}
      label={p.label}
      htmlFor={`v2-${p.input ?? p.id}`}
      description={p.description}
      value={
        <NumberField
          id={`v2-${p.input ?? p.id}`}
          label={p.label}
          labelHidden
          value={p.value}
          bounds={p.bounds}
          parse={p.parse}
          step={p.step}
          emptyValue={p.emptyValue}
          whole={p.whole === true}
          places={p.places}
          clampMessage={(used, b) => strings.fields.clamped(p.who, b.min, b.max, used, p.places)}
          invalidMessage={(current) =>
            strings.fields.invalid(p.who, p.parse, p.bounds.min, p.bounds.max, current, p.places)
          }
          onCommit={p.onCommit}
        />
      }
    >
      {p.slider && (finite || scale !== undefined) ? (
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
      ) : undefined}
    </LedgerRow>
  );
};

export type ModelsSheetProps = {
  values: ModelsValues;
  onChange: (patch: Partial<ModelsValues>) => void;
  /** §1MP 5: Bitcoin's colour square (shown on the chart); starts ON. */
  on?: boolean;
  onOn?: (next: boolean) => void;
  /** §2A: "Show historic price" (render.showHistoric), off by default. */
  historic?: boolean;
  onHistoric?: (next: boolean) => void;
  /** §1MP 8: Bitcoin's colour name; kept by the shell (ruling 3). Without it the sheet keeps its own. */
  colour?: string;
  onColour?: (name: string) => void;
  /** main's live Years cap (maxYears of the weeks since the last halving); the absolute cap before halvings load. */
  yearsMax?: number;
  /** Stories and tests: force the two-column walk list (the pane otherwise reads DESKTOP). */
  wide?: boolean;
  /** Stories and tests: the assets open on first render. */
  initialOpen?: readonly string[];
};

type AssetId = (typeof copy.assets)[number]["id"];

type ModelMeta = (typeof modelsPaneSchema.models)[number];

/**
 * A model's variable range: the model's own rangeMin…rangeMax (G12-mirrored), and a typed value
 * outside it clamps to the nearest limit on commit. Form's §1MP ruling 2 replaces §1Q Rule 0's open
 * top: R (%) is the engine's 0–1000 (cagr.ts rangeMax, the old UI's limit too), its slider's soft
 * top the same 1000. Previous Halvings is 2–3 (Probe M3; the back end uses at most the 3 halvings
 * before the current one, so a larger count changes nothing).
 */
export const variableBounds = (meta: ModelMeta | undefined): Bounds => {
  const min = meta === undefined || meta.rangeMin === "Infinity" ? 0 : meta.rangeMin;
  const max = meta === undefined || meta.rangeMax === "Infinity" ? Infinity : meta.rangeMax;
  return { min, max };
};

/** The variable as the back end uses it (a stored value from before a clamp reads clamped). */
export const usedVariable = (values: ModelsValues): number => {
  const b = variableBounds(modelsPaneSchema.models.find((m) => m.name === values.model));
  return Math.min(b.max, Math.max(b.min, values.variable));
};

/** §1MP 9: "{model part}, {walk} walk, volatility {Volatility}", live from the settings. */
export const summaryOf = (values: ModelsValues): string => {
  const meta = modelsPaneSchema.models.find((m) => m.name === values.model);
  const used = restOf(meta?.varInput ?? "")(usedVariable(values));
  const part =
    values.model === "CAGR"
      ? copy.grows(used)
      : values.model === "Historic"
        ? copy.replays(used)
        : values.model;
  return copy.summary(part, values.walk, restOf(controls.volatility.label)(values.volatility));
};

/**
 * §1MP 7: "ergodic" when Volatility > 0; both clamps are on or the walk is neither Random nor
 * Sin; and the walk isn't Random or Volatility ≥ 0.05.
 */
export const ergodicOf = (
  v: Pick<ModelsValues, "walk" | "volatility" | "clampTop" | "clampBottom">,
) =>
  v.volatility > 0 &&
  ((v.clampTop && v.clampBottom) || (v.walk !== "Random" && v.walk !== "Sin")) &&
  (v.walk !== "Random" || v.volatility >= 0.05);

/**
 * V32-BUILD §1MP, the Models pane: the asset ledger (Bitcoin, S&P, Inflation) and the top-level
 * Simulation group. Every back-end setting in the back end's own words (§1f); a model's own
 * options sit under the price-model selector and change with it.
 */
export const ModelsSheet = ({
  values,
  onChange,
  on = true,
  onOn,
  historic = false,
  onHistoric,
  colour: keptColour,
  onColour,
  yearsMax = controls.years.max,
  wide,
  initialOpen = [],
}: ModelsSheetProps): JSX.Element => {
  const desktop = useMedia(DESKTOP);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(initialOpen));
  const [modelList, setModelList] = useState(false);
  const [ownColour, setOwnColour] = useState<string>(copy.colours[0].name);
  const colour = keptColour ?? ownColour;
  const setColour = (name: string): void => {
    setOwnColour(name);
    onColour?.(name);
  };
  const meta = modelsPaneSchema.models.find((m) => m.name === values.model);
  const varBounds = variableBounds(meta);
  const softTop = meta === undefined || meta.rangeMax === "Infinity" ? undefined : meta.rangeMax;
  const volStep =
    values.walk === "Bubble" ? controls.volatility.stepBubble : controls.volatility.stepOther;
  const ergodic = ergodicOf(values);
  const btcColour = colourOf(colour);

  const root = styles["root"] ?? "models-root";
  const list = styles["list"] ?? "models-list";
  const erg = styles["erg"] ?? "models-erg";
  const standIn = styles["standin"] ?? "models-standin";
  const val = styles["value"] ?? "models-value";
  const pair = styles["pair"] ?? "models-pair";
  const tick = styles["tick"] ?? "models-tick";
  const assets = styles["assets"] ?? "models-assets";

  const options = modelList ? null : (
    <>
      {meta?.showVariable === true ? (
        <Editor
          key={values.model}
          id="variable"
          label={meta.varInput}
          value={usedVariable(values)}
          bounds={varBounds}
          parse={controls.variable.parse}
          step={controls.variable.step}
          emptyValue={null}
          whole={COUNT_FIELDS.includes(meta.varInput)}
          places={placesOf(meta.varInput)}
          who={noun(meta.varInput)}
          softTop={softTop}
          slider
          description={copy.settingDesc[meta.varInput]}
          onCommit={(variable) => {
            onChange({ variable });
          }}
        />
      ) : null}
      {meta?.showMinMaxMultiple === true ? (
        <Editor
          id="minmax"
          label="+/-"
          value={values.minMaxMultiple}
          bounds={{ min: controls.minMaxMultiple.floor, max: Infinity }}
          parse={controls.minMaxMultiple.parse}
          step={controls.minMaxMultiple.step}
          emptyValue={null}
          places={placesOf("+/-")}
          who={strings.fields.nouns.minMaxMultiple}
          slider={false}
          description={copy.settingDesc["+/-"]}
          onCommit={(minMaxMultiple) => {
            onChange({ minMaxMultiple });
          }}
        />
      ) : null}
    </>
  );

  const bitcoin = (
    <>
      <SectionLabel text={strings.sections.grow} id="grp-grow" />
      <div className={list}>
        <Select
          id="v2-model"
          labelledBy="grp-grow"
          options={modelsPaneSchema.modelOrder}
          value={values.model}
          describe={(m) => copy.modelDesc[m] ?? ""}
          onOpenChange={setModelList}
          onChange={(choice) => {
            onChange(choosePatch(choice));
          }}
        />
        {options}
      </div>
      <SectionLabel text={strings.sections.bumpy} />
      <div className={list}>
        <Select
          id="v2-walk"
          label={controls.walk.label}
          options={modelsPaneSchema.walks}
          value={values.walk}
          describe={(w) => copy.walkDesc[w] ?? ""}
          columns={wide ?? desktop}
          onChange={(walk) => {
            onChange({ walk });
          }}
        />
        <LedgerRow
          id="row-clamp"
          label={controls.clamp.label}
          kind="pair"
          description={copy.settingDesc[controls.clamp.label]}
          value={
            <span className={pair}>
              <TickToggle
                size="pair"
                label={controls.clamp.bottomLabel}
                name={copy.clampMin}
                checked={values.clampBottom}
                onChange={(clampBottom) => {
                  onChange({ clampBottom });
                }}
              />
              <TickToggle
                size="pair"
                label={controls.clamp.topLabel}
                name={copy.clampMax}
                checked={values.clampTop}
                onChange={(clampTop) => {
                  onChange({ clampTop });
                }}
              />
            </span>
          }
        />
        <p className={erg} aria-live="polite">
          {ergodic ? copy.ergodic : copy.notErgodic}
          {ergodic ? (
            <span className={tick} aria-hidden="true">
              <Icon name="check" />
            </span>
          ) : null}
        </p>
        <Editor
          id="volatility"
          input="vol"
          label={controls.volatility.label}
          value={values.volatility}
          bounds={controls.volatility.accept}
          parse={controls.volatility.parse}
          step={volStep}
          emptyValue={controls.volatility.emptyValue}
          who={strings.fields.nouns.volatility}
          slider
          description={copy.settingDesc[controls.volatility.label]}
          onCommit={(volatility) => {
            onChange({ volatility });
          }}
        />
        {/* §1MP 7: samples are per asset; Bitcoin's is the engine's one sample count. */}
        <Editor
          id="samples"
          label={SAMPLES_LABEL}
          value={values.samples}
          bounds={SAMPLE_BOUNDS}
          parse={controls.samples.parse}
          step={1}
          emptyValue={controls.samples.emptyValue}
          who={strings.fields.nouns.samples}
          slider
          description={copy.settingDesc["samples"]}
          onCommit={(samples) => {
            onChange({ samples });
          }}
        />
      </div>
      <SectionLabel text={strings.sections.chart} />
      <div className={list}>
        <TickToggle
          label={copy.showHistoric}
          checked={historic}
          onChange={(next) => onHistoric?.(next)}
        />
        <LedgerRow
          id="row-colour"
          label={copy.colour}
          value={<span className={val}>{colour}</span>}
        >
          <Swatches
            labelledBy="row-colour-label"
            options={copy.colours}
            value={colour}
            onChange={setColour}
          />
        </LedgerRow>
      </div>
    </>
  );

  const rows = copy.assets.map(
    ({ id, name, colour: c }: { id: AssetId; name: string; colour: string }) => {
      const btc = id === "bitcoin";
      return (
        <AssetRow
          key={id}
          id={`asset-${id}`}
          asset={id}
          name={name}
          summary={btc ? summaryOf(values) : copy.notYet}
          colour={btc ? btcColour : c}
          open={open.has(id)}
          onToggle={(next) => {
            setOpen((was) => {
              const s = new Set(was);
              if (next) s.add(id);
              else s.delete(id);
              return s;
            });
          }}
          square={
            btc
              ? { on, label: copy.showOn(name), onChange: (next) => onOn?.(next) }
              : { on: false, label: copy.inertOn(name), inert: true }
          }
        >
          {btc ? bitcoin : <p className={standIn}>{copy.standIn(name)}</p>}
        </AssetRow>
      );
    },
  );

  return (
    <div className={root}>
      {/* No visible pane title (the MODELS tab names it); the h2 is for headings navigation. */}
      <VisuallyHidden as="h2">{modelsPaneSchema.title}</VisuallyHidden>
      <div className={assets} role="list" aria-label={copy.label}>
        {rows}
      </div>
      <div role="group" aria-labelledby="grp-sim">
        <SectionLabel text={strings.sections.simulation} id="grp-sim" />
        <div className={list}>
          <Editor
            id="years"
            label={strings.fields.yearsLabel}
            value={values.years}
            bounds={{ min: controls.years.min, max: yearsMax }}
            parse={controls.years.parse}
            step={1}
            emptyValue={controls.years.emptyValue}
            who={strings.fields.nouns.years}
            slider
            description={copy.settingDesc["years"]}
            onCommit={(years) => {
              onChange({ years });
            }}
          />
        </div>
      </div>
    </div>
  );
};
