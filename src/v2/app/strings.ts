/**
 * Provisional copy for Slice 1 (V32-BUILD Gap 7): headline, kicker, section names, chart labels
 * and field messages, in one place so Form can rewrite them without touching components.
 * Setting labels are NOT here: they are the back end's text, verbatim (models/schema.ts).
 * Numbers always go through money.ts.
 */
import { fmtUSD, fmtUSDRange, nameUSD } from "../design/format/money";

const count = (n: number): string => n.toLocaleString("en-US");

/** "goes" / "go", "takes" / "take" for singular and plural nouns. */
type Noun = { name: string; plural: boolean };

const range = (min: number, max: number): string =>
  Number.isFinite(max) ? `from ${count(min)} to ${count(max)}` : `from ${count(min)} up`;

/** 10000 → "10k"; anything not a whole thousand stays as written. */
const kilo = (n: number): string =>
  n >= 1000 && n % 1000 === 0 ? `${String(n / 1000)}k` : String(n);

export const strings = {
  brand: { stack: "STACK", math: "MATH", name: "StackMath" },
  headline: {
    /** Desktop kicker above the headline sentence. */
    kicker: (samples: number, model: string): string =>
      `From today \u00B7 ${count(samples)} ${samples === 1 ? "future" : "futures"} \u00B7 ${model}`,
    /** The model headline sentence (.dh on desktop, half sheet on phone, chart aria-label). */
    sentence: (median: number, year: number, low: number, high: number): string =>
      `Bitcoin\u2019s median price reaches ${fmtUSD(median)} by ${year}; 9 in 10 futures end between ${fmtUSD(low)} and ${fmtUSD(high)}.`,
    /** The same sentence, spoken (the chart's aria-label): "$29.5 billion", not "$29.5B". */
    spoken: (median: number, year: number, low: number, high: number): string =>
      `Bitcoin\u2019s median price reaches ${nameUSD(median)} by ${year}; 9 in 10 futures end between ${nameUSD(low)} and ${nameUSD(high)}.`,
    /** Before the engine returns: no headline number (§1h empty). */
    pending: "Bitcoin\u2019s price, across the futures the model draws.",
    /** The engine's prices overflowed (Probe B2): said plainly, with what to do. */
    outOfRange:
      "At these settings Bitcoin\u2019s price grows past any number we can show. Try a smaller value.",
    /** Phone h1. */
    phoneTitle: "Bitcoin\u2019s price",
  },
  chart: {
    today: (monthYear: string): string => `Today \u00B7 ${monthYear}`,
    caption: "THE WORLD \u00B7 \u20BF PRICE",
    /** Under the end label when the bands are clipped at the top edge (§1h, Form n10). */
    outOfRange: "Prices here run past what the chart can draw.",
    /** §1h Chart · no data (Form n11): after 400ms with no price, then on failure or timeout. */
    loading: "Loading prices\u2026",
    failed: "Prices couldn\u2019t load. Check your connection; the chart will try again.",
    tryAgain: "Try again",
    /** §1M: every model is OFF (the empty frame's caption, and the chart's name). */
    off: "Turn a model on to see it here.",
    endLabel: (median: number, low: number, high: number): string =>
      `\u20BF price \u00B7 ${fmtUSD(median)} \u00B7 ${fmtUSDRange(low, high)}`,
    /** Narrow charts (<480px): the same label on two lines, value then range. */
    endLabelLines: (median: number, low: number, high: number): [string, string] => [
      `\u20BF price \u00B7 ${fmtUSD(median)}`,
      fmtUSDRange(low, high),
    ],
  },
  /** §1M: the Models pane as an asset ledger, in this locked order. */
  models: {
    label: "Assets",
    assets: [
      { id: "bitcoin", name: "Bitcoin" },
      { id: "sp", name: "S&P" },
      { id: "inflation", name: "Inflation" },
    ],
    /** §1V: "CAGR 28% · Bubble · 1,000 futures"; a percent variable joins its model's name. */
    summary: (model: string, walk: string, samples: number): string =>
      `${model} \u00B7 ${walk} \u00B7 ${samples.toLocaleString("en-US")} ${samples === 1 ? "future" : "futures"}`,
    percent: (model: string, value: number): string => `${model} ${String(value)}%`,
    notYet: "Not yet modelled",
    /** §1V: a stand-in's open body. */
    standIn: (name: string): string =>
      `${name} isn\u2019t modelled yet. When it is, its settings will open here.`,
    /** §1V: the open Bitcoin header names what you're editing. */
    openName: (name: string): string => `${name} \u00B7 price model`,
    showOn: (name: string): string => `Show ${name} on chart`,
    /** §1N: a Select's tray, named for the choice it belongs to. */
    settings: (choice: string): string => `${choice} settings`,
  },
  sections: {
    priceModel: "Price model",
    pricesMove: "How prices move",
    simulation: "Simulation",
  },
  dock: {
    models: "Models",
    plans: "Plans",
    stats: "Stats",
    search: "Search",
    settings: "Settings",
    label: "Panes",
    grab: { open: "Open the Models sheet", close: "Close the Models sheet" },
    /** §1L.5: the sheet's position, announced after every move. */
    sheet: {
      closed: "Sheet closed",
      half: "Sheet half open",
      full: "Sheet full",
    },
  },
  fields: {
    /**
     * §1Q: each field's focus-range slider, keyed by the back end's label. The first 80% of the
     * track is linear across 0…focusTop; the rest is log up to the soft top (the model's own
     * rangeMax, G12-mirrored). Marks are small ticks; only `labelled` shows its number. A field
     * with no entry gets a plain linear slider.
     */
    focus: {
      "R (%)": {
        focusTop: 50,
        step: 1,
        marks: [0, 10, 25, 50],
        labelled: 50,
        spoken: (n: number): string => `${count(n)} percent`,
      },
    } as Record<
      string,
      | {
          focusTop: number;
          step: number;
          marks: number[];
          labelled: number;
          spoken: (n: number) => string;
        }
      | undefined
    >,
    /** Clamp (Gap 11): the value used is shown, not silently swapped. */
    clamped: (noun: Noun, min: number, max: number, used: number): string =>
      `${noun.name} ${noun.plural ? "go" : "goes"} ${range(min, max)}. We used ${count(used)}.`,
    /** Invalid text: cause, next step, reassurance (Probe M2). */
    invalid: (noun: Noun, kind: "int" | "float", min: number, max: number, current: number) =>
      `${noun.name} ${noun.plural ? "take" : "takes"} ${kind === "int" ? "a whole number" : "a number"} ${range(min, max)}. Your last value, ${count(current)}, is still in use.`,
    years: (years: number): string => `(~${count(years)} years)`,
    /** The samples row's label, its range from the G12-mirrored bounds: 1 to 10,000 reads "1-10k". */
    samplesLabel: (min: number, max: number): string =>
      `Statistical Sample Count (${kilo(min)}-${kilo(max)}):`,
    nouns: {
      volatility: { name: "Volatility", plural: false },
      epochs: { name: "Epochs", plural: true },
      samples: { name: "Samples", plural: true },
      minMaxMultiple: { name: "The +/- multiple", plural: false },
    },
  },
} as const;
