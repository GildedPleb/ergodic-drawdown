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
  | { kind: "invalid" };

/** What committing `text` does. `emptyValue` is the value an empty field commits (or null). */
export const resolveEntry = (
  text: string,
  parse: NumberParse,
  bounds: Bounds,
  emptyValue: number | null,
): EntryResult => {
  if (normalizeNumberText(text) === "") {
    return emptyValue === null ? { kind: "invalid" } : { kind: "ok", value: emptyValue };
  }
  const typed = parseNumber(text, parse);
  if (Number.isNaN(typed)) return { kind: "invalid" };
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
 * mantissa at full precision so the shown value is the used one. m7 and
 * normalizeNumberText read every form back.
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

/** The ×10 form's mantissa and exponent, or undefined for grouped digits. */
const sciOf = (n: number): [string, string] | undefined => {
  const a = Math.abs(n);
  if (a === 0 || (a < SCI_FROM && a >= SCI_BELOW)) return undefined;
  const [m = "", e = ""] = n.toExponential().split("e");
  return [m, e.replace("+", "")];
};

export const showNumber = (n: number): string => {
  if (!Number.isFinite(n)) return "";
  const a = Math.abs(n);
  const sci = sciOf(n);
  if (sci !== undefined) {
    const [m, e] = sci;
    const exp = Array.from(e, String)
      .map((c) => (c === "-" ? "⁻" : SUP[Number(c)]))
      .join("");
    return `${m}${TIMES}${exp}`;
  }
  const s = a < 1e-6 && a !== 0 ? plainTiny(n) : String(n);
  return s.replace(/^(-?)(\d+)/, (_, sign: string, int: string) => sign + group(int));
};

/**
 * What a screen reader hears for a field value (Probe R2 m3, Form ruling 4): the shown digits, the
 * ×10 form in words ("1.2 times 10 to the 12"), and "minus" for a sign; never a long digit string.
 */
export const speakNumber = (n: number): string => {
  if (!Number.isFinite(n)) return "";
  const sci = sciOf(n);
  const shown =
    sci === undefined
      ? showNumber(n)
      : `${sci[0]} times 10 to the ${sci[1].replace("-", "minus ")}`;
  return shown.replace(/^-/, "minus ");
};
