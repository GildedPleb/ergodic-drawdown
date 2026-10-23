/**
 * NumberField entry rules (V32-BUILD §1g, Probe M3 / FL-001). Pure functions; the component owns
 * the draft text and calls these on commit (Enter, blur, release of a held step key).
 *
 * - Clamp: a parsed value outside the back end's accepted range commits the nearest bound and
 *   reports it, so the field can say so. An Infinity bound never clamps (only the finite side).
 * - Invalid: text that does not parse (empty with no emptyValue, "1e", "abc") commits nothing;
 *   the last valid value stays in effect. NaN is never committed.
 * - Postel-liberal text (m7): commas, spaces, NBSP, narrow/thin spaces and U+2212 normalise first.
 */

/** Superscript digits, for the ×10ⁿ form. */
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** m7: "1,000", "2 000", "2\u00A0000", "\u22120.4" → plain numeric text. */
export const normalizeNumberText = (text: string): string =>
  text
    .replace(/[\s,\u00A0\u202F\u2009]/g, "")
    .replace(/\u2212/g, "-")
    // "1 × 10³⁰⁰" / "2.5 × 10⁻²⁴" (showNumber's large and tiny forms, spaces already gone) → "1e300" / "2.5e-24".
    .replace(
      /[×x]10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/,
      (_, exp: string) =>
        `e${Array.from(exp, String)
          .map((c) => (c === "⁻" ? "-" : String(SUP.indexOf(c))))
          .join("")}`,
    );

export type NumberParse = "float" | "int";

/** Strict parse: the whole text must be a number ("1e" and "12abc" are NaN); int needs an integer. */
export const parseNumber = (text: string, parse: NumberParse): number => {
  const clean = normalizeNumberText(text);
  if (clean === "") return Number.NaN;
  const n = Number(clean);
  if (!Number.isFinite(n)) return Number.NaN;
  return parse === "int" && !Number.isInteger(n) ? Number.NaN : n;
};

/** The back end's accepted range; either side may be ±Infinity. */
export type Bounds = { min: number; max: number };

const clampTo = (n: number, bounds: Bounds): number =>
  Math.min(bounds.max, Math.max(bounds.min, n));

export type EntryResult =
  | { kind: "ok"; value: number }
  | { kind: "clamped"; value: number; typed: number }
  /** `whole`: Form 2e, a comma that is not thousands grouping in a whole-number field ("2,5"). */
  | { kind: "invalid"; whole?: true };

/** Form 2e: "1,000" and "-12,345,678" group thousands; "2,5", "1,00" and ",5" do not. */
const GROUPED = /^-?\d{1,3}(,\d{3})+(\.\d*)?$/;
const strayComma = (text: string): boolean => {
  const bare = text.replace(/[\s\u00A0\u202F\u2009]/g, "").replace(/\u2212/g, "-");
  return bare.includes(",") && !GROUPED.test(bare);
};

/**
 * What committing `text` does. `emptyValue` is the value an empty field commits (or null). A
 * `whole` field (Form 2a: a count, e.g. Previous Halvings) rounds to the nearest integer first.
 * Form 2e: in a whole-number field (`whole`, or an int parse) a comma is only thousands grouping;
 * any other comma is invalid (never read as 25 or 2.5).
 */
export const resolveEntry = (
  text: string,
  parse: NumberParse,
  bounds: Bounds,
  emptyValue: number | null,
  whole = false,
): EntryResult => {
  if (normalizeNumberText(text) === "") {
    return emptyValue === null ? { kind: "invalid" } : { kind: "ok", value: emptyValue };
  }
  if ((whole || parse === "int") && strayComma(text)) return { kind: "invalid", whole: true };
  const parsed = parseNumber(text, parse);
  if (Number.isNaN(parsed)) return { kind: "invalid" };
  const typed = whole ? Math.round(parsed) : parsed;
  const value = clampTo(typed, bounds);
  return value === typed ? { kind: "ok", value } : { kind: "clamped", value, typed };
};

const decimalsOf = (n: number): number => {
  const s = String(n);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
};

/** One arrow step (×10 for PgUp/PgDn) from `base`, clamped, rounded to the step's decimals. */
export const stepValue = (
  base: number,
  direction: 1 | -1,
  step: number,
  bounds: Bounds,
  big = false,
): number => {
  const raw = base + direction * step * (big ? 10 : 1);
  const places = Math.max(decimalsOf(step), decimalsOf(base));
  return clampTo(Number(raw.toFixed(places)), bounds);
};

/** m6: a step that stopped on a finite bound (the field then shows its clamp message). */
export const onBound = (n: number, bounds: Bounds): boolean =>
  (Number.isFinite(bounds.min) && n === bounds.min) ||
  (Number.isFinite(bounds.max) && n === bounds.max);

/** Display text for a committed value (no exponent for the ranges the back end accepts). */
const group = (int: string): string => int.replace(/\B(?=(\d{3})+$)/g, ",");

/**
 * The shown text (Probe Minor 4: never "1e-7"): "1,000", "12,345.5", "0.1", "0.0000001";
 * from 1e9 up and below 1e-20, ×10 with real superscripts ("1.2 × 10¹²", "-2.5 × 10⁻²⁴"), the
 * mantissa at 3 significant figures, trailing zeros dropped (Form 4a); editNumber keeps it in full
 * for a focused field. m7 and normalizeNumberText read every form back.
 */
/** 1.2345e-7 → "0.00000012345": the shortest round-trip digits, written out in full. */
const plainTiny = (n: number): string => {
  const [m = "", e = ""] = Math.abs(n).toExponential().split("e");
  const digits = m.replace(".", "");
  return `${n < 0 ? "-" : ""}0.${"0".repeat(-Number(e) - 1)}${digits}`;
};

/** Form §1MP ruling 4: grouped digits up to 999,999,999; from 1e9 up (and below 1e-20) ×10 form. */
const SCI_FROM = 1e9;
const SCI_BELOW = 1e-20;
/** No-break spaces round the ×, so "1.2 × 10¹²" never wraps; normalizeNumberText strips them. */
const TIMES = "\u00A0×\u00A010";

/** Form 2a: the percent and decimal fields (R, +/-) rest at 2 decimals, everywhere they're shown. */
export const DECIMAL_PLACES = 2;
/** Form 4a: a shown ×10 mantissa keeps 3 significant figures (2 decimals), trailing zeros dropped. */
const SHOWN_DECIMALS = 2;

/** The ×10 form's mantissa and exponent (full, or to `decimals`), or undefined for grouped digits. */
const sciOf = (n: number, decimals?: number): [string, string] | undefined => {
  const a = Math.abs(n);
  if (a === 0 || (a < SCI_FROM && a >= SCI_BELOW)) return undefined;
  const [m = "", e = ""] = n.toExponential(decimals).split("e");
  return [decimals === undefined ? m : m.replace(/\.?0+$/, ""), e.replace("+", "")];
};

const formNumber = (n: number, decimals?: number, places?: number): string => {
  if (!Number.isFinite(n)) return "";
  const sci = sciOf(n, decimals);
  if (sci !== undefined) {
    const [m, e] = sci;
    const exp = Array.from(e, String)
      .map((c) => (c === "-" ? "⁻" : SUP[Number(c)]))
      .join("");
    return `${m}${TIMES}${exp}`;
  }
  // Form 2a: a decimal field rests at `places` decimals (rounded, trailing zeros dropped).
  const v = places === undefined ? n : Number(n.toFixed(places)) || 0;
  const a = Math.abs(v);
  const s = a < 1e-6 && a !== 0 ? plainTiny(v) : String(v);
  return s.replace(/^(-?)(\d+)/, (_, sign: string, int: string) => sign + group(int));
};

/** The resting text: a ×10 value at 3 significant figures ("1.23 × 10⁹"). */
export const showNumber = (n: number): string => formNumber(n, SHOWN_DECIMALS);
/** Form 2a: the resting text of a field that rests at `places` decimals ("123.46"); see showNumber. */
export const shownAt =
  (places?: number) =>
  (n: number): string =>
    formNumber(n, SHOWN_DECIMALS, places);
/** A focused field's text: the full value, so editing never loses digits ("1.23456789 × 10⁹"). */
export const editNumber = (n: number): string => formNumber(n);

/** Form 4d: the full value as raw digits, no grouping ("1000", "-12345.5"); ×10 stays as editNumber. */
export const rawNumber = (n: number): string => editNumber(n).replace(/,/g, "");

/**
 * Form 4c/4d: a focused field's text after a commit: the typed text while it is exactly the value
 * used; after a clamp or rounding, the value used as raw digits ("1000", not "1,000" or "5000").
 */
export const keptText = (text: string, parse: NumberParse, used: number): string =>
  parseNumber(text, parse) === used ? text : rawNumber(used);

/**
 * What a screen reader hears for a field value (Probe R2 m3, Form ruling 4): the shown digits, the
 * ×10 form in words ("1.2 times 10 to the 12"), and "minus" for a sign; never a long digit string.
 */
export const speakNumber = (n: number, places?: number): string => {
  if (!Number.isFinite(n)) return "";
  const sci = sciOf(n, SHOWN_DECIMALS);
  const shown =
    sci === undefined
      ? shownAt(places)(n)
      : `${sci[0]} times 10 to the ${sci[1].replace("-", "minus ")}`;
  return shown.replace(/^-/, "minus ");
};
