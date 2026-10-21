/**
 * Provisional copy for Slice 1 (V32-BUILD Gap 7): headline, kicker, section names, chart labels
 * and field messages, in one place so Form can rewrite them without touching components.
 * Setting labels are NOT here: they are the back end's text, verbatim (models/schema.ts).
 * Numbers always go through money.ts.
 */
import { fmtUSD, fmtUSDRange, nameUSD } from "../design/format/money";
import { speakNumber } from "../design/primitives/NumberField/entry";
import type { Spread } from "./world/spread";

const count = (n: number): string => n.toLocaleString("en-US");

/** "goes" / "go", "takes" / "take" for singular and plural nouns. */
type Noun = { name: string; plural: boolean };

const range = (min: number, max: number): string =>
  Number.isFinite(max) ? `from ${count(min)} to ${count(max)}` : `from ${count(min)} up`;

/** 10000 → "10k"; anything not a whole thousand stays as written. */
const kilo = (n: number): string =>
  n >= 1000 && n % 1000 === 0 ? `${String(n / 1000)}k` : String(n);

/** The headline for a spread (world/spread.ts), with `$` written by `usd`. */
const headline = (spread: Spread, year: number, usd: (v: number) => string): string => {
  if (spread.kind === "one") {
    return `Bitcoin\u2019s price reaches ${usd(spread.value)} by ${year} in this one future.`;
  }
  if (spread.kind === "allAt") {
    return `Bitcoin\u2019s median price reaches ${usd(spread.value)} by ${year}; all ${count(spread.n)} futures end at ${usd(spread.value)}.`;
  }
  const reach = `Bitcoin\u2019s median price reaches ${usd(spread.median)} by ${year}; `;
  const between = `between ${usd(spread.low)} and ${usd(spread.high)}.`;
  return spread.kind === "all"
    ? `${reach}all ${count(spread.n)} futures end ${between}`
    : `${reach}9 in 10 futures end ${between}`;
};

export const strings = {
  brand: { stack: "STACK", math: "MATH", name: "StackMath" },
  headline: {
    /** Desktop kicker above the headline sentence. */
    kicker: (samples: number, model: string): string =>
      `From today \u00B7 ${count(samples)} ${samples === 1 ? "future" : "futures"} \u00B7 ${model}`,
    /**
     * The model headline sentence (.dh on desktop, half sheet on phone), claiming only what N
     * supports (world/spread.ts).
     */
    sentence: (spread: Spread, year: number): string => headline(spread, year, fmtUSD),
    /** The same sentence, spoken (the chart's aria-label): "$29.5 billion", not "$29.5B". */
    spoken: (spread: Spread, year: number): string => headline(spread, year, nameUSD),
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
    /** §1T: shown while the chart is zoomed. */
    resetZoom: "Reset zoom",
    /** §1M: every model is OFF (the empty frame's caption, and the chart's name). */
    off: "Turn a model on to see it here.",
    endLabel: (median: number, low: number, high: number): string =>
      `\u20BF price \u00B7 ${fmtUSD(median)} \u00B7 ${fmtUSDRange(low, high)}`,
    /** Narrow charts (<480px): the same label on two lines, value then range. */
    endLabelLines: (median: number, low: number, high: number): [string, string] => [
      `\u20BF price \u00B7 ${fmtUSD(median)}`,
      fmtUSDRange(low, high),
    ],
    /**
     * The end label for a spread (world/spread.ts), one line or split in two: median plus p5–p95
     * (N ≥ 20) or min–max (2 ≤ N < 20); the single value when there is one.
     */
    endLines: (spread: Spread, split: boolean): string[] => {
      if (spread.kind === "one" || spread.kind === "allAt") {
        return [`\u20BF price \u00B7 ${fmtUSD(spread.value)}`];
      }
      return split
        ? strings.chart.endLabelLines(spread.median, spread.low, spread.high)
        : [strings.chart.endLabel(spread.median, spread.low, spread.high)];
    },
  },
  /** §1MP: the Models pane as an asset ledger, in this locked order (copy: v54-book/COPY.md). */
  models: {
    label: "Assets",
    assets: [
      { id: "bitcoin", name: "Bitcoin", colour: "var(--path-btc-price)" },
      { id: "sp", name: "S&P", colour: "var(--path-sp)" },
      { id: "inflation", name: "Inflation", colour: "var(--path-inflation)" },
    ],
    /** §1MP 9: "{model part}, {walk} walk, volatility {Volatility}". */
    summary: (model: string, walk: string, volatility: string): string =>
      `${model}, ${walk} walk, volatility ${volatility}`,
    /** CAGR's model part (cagr.ts L6–10). */
    grows: (r: string): string => `Grows ${r}% a year`,
    /** Historic's model part (historic.ts L26–27). */
    replays: (n: string): string => `Replays ${n} past halving cycles`,
    notYet: "Not yet modelled",
    /** A stand-in's open body. */
    standIn: (name: string): string =>
      `${name} isn\u2019t modelled yet. When it is, its settings will open here.`,
    /** §1MP 5: the colour square's name. */
    showOn: (name: string): string => `Show ${name} on chart`,
    inertOn: (name: string): string => `${name} on chart (not yet modelled)`,
    /** §2A: the tick row under "On the chart". */
    showHistoric: "Show historic price",
    /** §1MP 7 Clamp: the toggles' names (the visible words stay the engine's Min / Max). */
    clampMin: "Clamp minimum price",
    clampMax: "Clamp maximum price",
    ergodic: "ergodic",
    notErgodic: "not ergodic",
    colour: "Colour",
    /** §1MP 8: the Colour chips, in order (₿ orange is the default). */
    colours: [
      { name: "\u20BF orange", colour: "var(--path-btc-price)" },
      { name: "Jade", colour: "var(--path-plan-1)" },
      { name: "Lapis", colour: "var(--path-plan-2)" },
      { name: "Amethyst", colour: "var(--path-plan-3)" },
      { name: "Citron", colour: "var(--path-plan-4)" },
      { name: "Orchid", colour: "var(--path-plan-5)" },
      { name: "Coral", colour: "var(--path-plan-6)" },
      { name: "$ green", colour: "var(--path-usd)" },
    ],
    /** COPY.md "Price models": one line per engine name, written from the source. */
    modelDesc: {
      "Power Law Regression Median":
        "Price follows a power curve of the days since 3 January 2009; the top is the same curve six years ahead.",
      "Power Law Support Line":
        "A power-law support line is the floor; a slower-rising power-law line is the top, never below the floor.",
      "Rainbow Chart": "One curve through time sets the top; the floor is a tenth of it.",
      CAGR: "Today\u2019s price compounded at R% a year; the top starts +/- times higher, the bottom +/- times lower.",
      "Stock-To-Flow 2024 Refit":
        "Price from the stock-to-flow ratio, coins mined so far against the past year\u2019s new coins; the band is 68% either side.",
      "Stock-To-Flow":
        "Price from the stock-to-flow ratio on a curve that sits above the 2024 refit; the band is 65% either side.",
      Historic:
        "Starts from the price at the last halving and replays past halving cycles: the top follows the best of them, the bottom the worst.",
    } as Record<string, string | undefined>,
    /** COPY.md "Walks". */
    walkDesc: {
      Bubble:
        "Each four-year cycle it climbs ever faster to the top, slides back to the floor, then rests just above it.",
      Momentum:
        "Rolls off the middle, speeding up until it hits the floor or the top, which kicks it back to the middle.",
      Pong: "Moves steadily from floor to top and back again, one crossing every four years.",
      Random: "Steps up or down by chance each week, with no pull either way.",
      Saw: "Creeps slowly upward, then snaps back to the floor and starts climbing again.",
      Shark:
        "Grows by a fixed share each week until it reaches the top, then shrinks by one until it nears the floor.",
      Sin: "Rises for two years and falls for two, along one smooth wave each four-year cycle.",
      "Vote Count":
        "Slides down a little every week; when it reaches the floor it jumps back to the top.",
      "\u{1F7E2}\u{1F7E2}\u{1F7E2}\u{1F534}":
        "Each four-year cycle it rises to the top in year one, falls to the floor in year two, then climbs slowly through years three and four.",
    } as Record<string, string | undefined>,
    /** COPY.md "Settings with a description line", v47, v50 and v52, keyed by the engine label. */
    settingDesc: {
      "R (%)": "The yearly growth rate the price compounds at.",
      "+/-": "How many times above and below today\u2019s price the top and bottom start.",
      "Previous Halvings": "How many past halving cycles to replay, besides the current one.",
      "Clamp Price:": "Min stops a walk going below the floor; Max stops it going above the top.",
      "Volatility (0-1):": "How big each week\u2019s random step is.",
      samples: "How many separate futures are drawn; each runs its own random walk.",
      years: "How many years ahead the simulation runs.",
    } as Record<string, string | undefined>,
  },
  sections: {
    grow: "How prices grow",
    bumpy: "How bumpy the ride is",
    chart: "On the chart",
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
        spoken: (n: number): string => `${speakNumber(n)} percent`,
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
    /** §1MP: the Years row's front-end label (main's own reads "Years (1-N):"). */
    yearsLabel: "Years",
    /** The samples row's label, its range from the G12-mirrored bounds: 1 to 10,000 reads "1-10k". */
    samplesLabel: (min: number, max: number): string =>
      `Statistical Sample Count (${kilo(min)}-${kilo(max)}):`,
    nouns: {
      volatility: { name: "Volatility", plural: false },
      years: { name: "Years", plural: true },
      samples: { name: "Samples", plural: true },
      minMaxMultiple: { name: "The +/- multiple", plural: false },
    },
  },
} as const;
