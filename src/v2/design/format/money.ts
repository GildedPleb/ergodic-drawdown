/**
 * StackMath money formatting (SYSTEM.md §6, MVP-SPEC G3). INVIOLABLE: ₿ is a prefix like $.
 *
 * All rounding is half-up on the decimal value (via 15 significant digits and BigInt), never on
 * binary floats, so `$9.995` rounds to `$10` and exactly half a sat rounds up to 1 sat.
 * The ₿ unit (sats / tenths) is chosen after rounding, so `0.99999999` → `₿1`. Dollars: cents only
 * below $1, whole dollars below $10,000 (raw value), k/M/B/T at 3 significant figures from $10,000.
 *
 * Form G3 rulings (v2.2): zero is `₿0` / `$0`; no trailing `.0` (`₿1`, `₿13`, `$1`, `$1k`);
 * NaN / ±∞ is an em dash whose accessible name is "not available"; fonts-failed prefixes
 * `BTC` + NBSP, and the accessible name is always "bitcoin 0.7" regardless of display.
 */

const MINUS = "\u2212";
const BTC = "\u20BF";
const EN = "\u2013";
const EM = "\u2014";
const NBSP = "\u00A0";

export type FormatOptions = {
  /** Exact sats (detail views and inputs). Default: display precision. */
  detail?: boolean;
  /** Fonts failed to load: prefix `BTC ` instead of ₿ (story 197). */
  fontsFailed?: boolean;
};

type Dec = { digits: bigint; exp: number };

/** Decimal form of a finite, non-negative number: value = digits × 10^exp. */
const toDec = (abs: number): Dec => {
  const [mantissa = "0", expPart] = abs.toPrecision(15).split("e");
  const [whole = "0", frac = ""] = mantissa.split(".");
  return { digits: BigInt(whole + frac), exp: Number(expPart ?? 0) - frac.length };
};

const pow10 = (n: number): bigint => 10n ** BigInt(n);

/** round_half_up(value × 10^decimals). */
const roundTo = (d: Dec, decimals: number): bigint => {
  const shift = d.exp + decimals;
  if (shift >= 0) return d.digits * pow10(shift);
  const div = pow10(-shift);
  const q = d.digits / div;
  return 2n * (d.digits % div) >= div ? q + 1n : q;
};

/** Exponent of the leading digit (floor(log10(value))). */
const leadExp = (d: Dec): number => d.digits.toString().length - 1 + d.exp;

const group = (s: string): string => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Scaled integer n with `decimals` places → "1,234.5"; trims trailing zeros unless keepZeros. */
const fixed = (n: bigint, decimals: number, keepZeros = false): string => {
  const s = n.toString().padStart(decimals + 1, "0");
  const whole = group(s.slice(0, s.length - decimals));
  let frac = decimals > 0 ? s.slice(s.length - decimals) : "";
  if (!keepZeros) frac = frac.replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole;
};

const btcPrefix = (options: FormatOptions | undefined): string =>
  options?.fontsFailed === true ? `BTC${NBSP}` : BTC;

/** Display decimals for a non-zero ₿ magnitude: 2 sig figs below ₿1 (≤ 8), 1 decimal from ₿1. */
const btcDecimals = (d: Dec): number => {
  if (roundTo(d, 8) < 100_000_000n) {
    const decimals = Math.min(8, 1 - leadExp(d));
    if (roundTo(d, decimals) < pow10(decimals)) return decimals;
  }
  return 1;
};

/** ₿ at a fixed number of decimals (trailing zeros trimmed); an end that rounds to 0 is `₿0`. */
const btcAt = (x: number, decimals: number, prefix: string): string => {
  const n = roundTo(toDec(Math.abs(x)), decimals);
  if (n === 0n) return `${prefix}0`;
  return `${x < 0 ? MINUS : ""}${prefix}${fixed(n, decimals)}`;
};

export const fmtBTC = (x: number, options?: FormatOptions): string => {
  if (!Number.isFinite(x)) return EM;
  const prefix = btcPrefix(options);
  if (x === 0) return `${prefix}0`;
  const sign = x < 0 ? MINUS : "";
  const d = toDec(Math.abs(x));
  const sats = roundTo(d, 8);
  if (sats === 0n) return `<${prefix}0.00000001`;
  if (options?.detail === true) return `${sign}${prefix}${fixed(sats, 8)}`;
  return btcAt(x, btcDecimals(d), prefix);
};

/** 3 significant figures in a unit (k, M, B, T), trailing zeros trimmed; undefined at 1000. */
const threeSig = (u: Dec, allowOver = false): string | undefined => {
  const lead = leadExp(u);
  // Past the last unit (1,000T and up) stay at 3 significant figures: $1,230T.
  if (allowOver && lead > 2) return group((roundTo(u, 2 - lead) * pow10(lead - 2)).toString());
  const decimals = Math.max(0, 2 - lead);
  const n = roundTo(u, decimals);
  if (!allowOver && n >= 1000n * pow10(decimals)) return undefined;
  return fixed(n, decimals);
};

/**
 * Form G3 (2026-10-19): cents only below $1 (2 decimals: `$0.45`); whole dollars from $1 up to
 * (not including) $10,000, decided on the raw value (`$12`, `$1,040`, `$9,950`, `$9,999.99` →
 * `$10,000`, never `$10k`); from $10,000, 3 significant figures with the unit stepping up
 * (Form, Slice 1 review): `$85.4k`, `$1.23M`, `$29.5B`, `$1.23T`, never `$29,533M`. Past the
 * trillions the T count keeps growing (`$1,230T`).
 */
const UNITS = [
  ["k", 3],
  ["M", 6],
  ["B", 9],
  ["T", 12],
] as const;

/**
 * Form (n4 revision, 2026-10-19): grouped T up to $999,999T; from $1,000,000T scientific notation
 * at 3 significant figures, trailing zeros kept: `$1.23×10²¹`, `$1.00×10²³`, with Unicode
 * superscript digits (and a superscript minus, never needed for money this large). $1,000,000T is
 * 10¹⁸ (the ruling's "(1e21)" does not match its own T bounds; the T bounds win, see the report).
 * Decided after rounding, so $999,999.5T is `$1.00×10¹⁸`; the largest grouped T is `$999,000T`.
 */
const SCI_FROM_EXP = 18;
const SUPER = "\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079";
const TIMES = "\u00D7";
const superscript = (n: number): string =>
  Array.from(String(n), (c) => (c === "-" ? "\u207B" : (SUPER[Number(c)] ?? c))).join("");

/**
 * Form (2026-10-19): a scientific exponent is always set in the UPRIGHT face, even inside an
 * italic label (no font patch: EB Garamond italic has no superior figures). Renderers split the
 * display text into runs and set each `sup` run upright.
 */
export type TextRun = { text: string; sup: boolean };
const SUP_RUN = /[\u2070\u00B9\u00B2\u00B3\u2074-\u2079\u207B]+/gu;

export const sciRuns = (text: string): TextRun[] => {
  const runs: TextRun[] = [];
  let at = 0;
  for (const m of text.matchAll(SUP_RUN)) {
    if (m.index > at) runs.push({ text: text.slice(at, m.index), sup: false });
    runs.push({ text: m[0], sup: true });
    at = m.index + m[0].length;
  }
  if (at < text.length || runs.length === 0) runs.push({ text: text.slice(at), sup: false });
  return runs;
};

/** 3 significant figures as [x.yz, exponent], rounded half-up; undefined below 10²¹. */
const sciParts = (d: Dec): [string, number] | undefined => {
  let lead = leadExp(d);
  let n = roundTo(d, 2 - lead);
  if (n >= 1000n) {
    n /= 10n;
    lead += 1;
  }
  return lead < SCI_FROM_EXP ? undefined : [fixed(n, 2, true), lead];
};

const usdBody = (d: Dec, raw: number): string => {
  const cents = roundTo(d, 2);
  if (cents === 0n) return "<$0.01";
  if (raw < 1) return cents < 100n ? `$${fixed(cents, 2, true)}` : "$1";
  if (raw < 10_000) return `$${group(roundTo(d, 0).toString())}`;
  const sci = sciParts(d);
  if (sci !== undefined) return `$${sci[0]}${TIMES}10${superscript(sci[1])}`;
  // The unit is chosen after rounding ($999,950 → $1M, $999.95B → $1T).
  for (const [unit, exp] of UNITS) {
    const last = unit === "T";
    const body = threeSig({ digits: d.digits, exp: d.exp - exp }, last);
    if (body !== undefined) return `$${body}${unit}`;
  }
  return EM;
};

const UNIT_WORDS: Record<string, string> = {
  k: "thousand",
  M: "million",
  B: "billion",
  T: "trillion",
};

/** Spoken units: "$29.5B" reads "$29.5 billion", never the letter B. */
const speakUnits = (s: string): string =>
  s.replace(
    /(\d)([kMBT])(?![A-Za-z])/g,
    (_, digit: string, unit: string) => `${digit} ${UNIT_WORDS[unit] ?? unit}`,
  );

export const fmtUSD = (x: number): string => {
  if (!Number.isFinite(x)) return EM;
  if (x === 0) return "$0";
  const body = usdBody(toDec(Math.abs(x)), Math.abs(x));
  return x < 0 && !body.startsWith("<") ? `${MINUS}${body}` : body;
};

/**
 * Ranges (BOOK §5, Form G3 ruling 2):
 * - Crossing zero is decided from the RAW values, before rounding; a crossing range always uses
 *   the word "to" with ₿ repeated: `−₿0.4 to ₿0.7`, never an en dash beside a minus.
 * - Both ends share the wider end's precision (`₿0.4–1.3`), except that a non-zero end which
 *   would round to 0 keeps its own significant digits, capped at sat precision:
 *   `−₿0.0021 to ₿0.42`, `₿0.0021–0.42`.
 * - A same-sign end below sat precision stays compact as 0: `₿0–0.7`.
 * - Same sign: one prefix, en dash, no spaces, number-line order: `₿0.4–0.7`, `−₿0.7–0.4` (one sign
 *   covers both; the spoken name repeats it). Equal ends collapse to one value.
 */
export const fmtBTCRange = (low: number, high: number, options?: FormatOptions): string => {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return EM;
  const [lo, hi] = low <= high ? [low, high] : [high, low];
  const prefix = btcPrefix(options);
  const crosses = lo < 0 && hi > 0;
  const wide = toDec(Math.max(Math.abs(lo), Math.abs(hi)));
  const shared =
    options?.detail === true || roundTo(wide, 8) === 0n ? undefined : btcDecimals(wide);
  const end = (x: number): string => {
    if (shared === undefined || x === 0) return fmtBTC(x, options);
    const d = toDec(Math.abs(x));
    if (roundTo(d, shared) !== 0n) return btcAt(x, shared, prefix);
    // Would round to 0 at the shared precision: own significant digits, capped at sats.
    if (roundTo(d, 8) !== 0n) return fmtBTC(x, options);
    // Same sign: compact, keeping the shared sign so the range stays one-signed (−₿0.7–0).
    return crosses ? fmtBTC(x, options) : `${x < 0 ? MINUS : ""}${prefix}0`;
  };
  const a = end(lo);
  const b = end(hi);
  if (crosses) return `${a} to ${b}`;
  if (a === b) return a;
  const negA = a.startsWith(MINUS);
  const negB = b.startsWith(MINUS);
  if (negA !== negB || a.startsWith("<") || b.startsWith("<")) return `${a} to ${b}`;
  const lead = negA ? MINUS + prefix : prefix;
  return `${lead}${a.slice(lead.length)}${EN}${b.slice(lead.length)}`;
};

/**
 * $ range (V32-BUILD Gap 5, Form default): one `$`, an en dash, each end in its own fmtUSD unit,
 * by analogy with `₿0.4–0.7`: `$400k–3.1M`. Crossing zero (raw values) uses "to" with `$`
 * repeated; equal ends collapse to one value.
 */
export const fmtUSDRange = (low: number, high: number): string => {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return EM;
  const [lo, hi] = low <= high ? [low, high] : [high, low];
  const a = fmtUSD(lo);
  const b = fmtUSD(hi);
  if (a === b) return a;
  if ((lo < 0 && hi > 0) || a.startsWith("<") || b.startsWith("<")) return `${a} to ${b}`;
  const lead = a.startsWith(MINUS) ? `${MINUS}$` : "$";
  return `${lead}${a.slice(lead.length)}${EN}${b.slice(lead.length)}`;
};

/**
 * Spoken $ range, in step with fmtUSDRange but never shortened: each end is spoken in full, with
 * its own currency, sign and unit word (Form): "$400 thousand to $3.1 million". Equal ends
 * collapse to one value, as on screen.
 */
export const nameUSDRange = (low: number, high: number): string => {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return NOT_AVAILABLE;
  const [lo, hi] = low <= high ? [low, high] : [high, low];
  if (fmtUSD(lo) === fmtUSD(hi)) return nameUSD(lo);
  return `${nameUSD(lo)} to ${nameUSD(hi)}`;
};

export const fmtBTCChange = (from: number, to: number, options?: FormatOptions): string =>
  `${fmtBTC(from, options)} → ${fmtBTC(to, options)}`;

const NOT_AVAILABLE = "not available";

/** Display text → spoken form: the ₿ / `BTC ` prefix reads "bitcoin", − reads "minus". */
const speakBtc = (display: string, prefix: string): string =>
  display
    .split(prefix)
    .join("bitcoin ")
    .replaceAll(MINUS, "minus ")
    .replaceAll("<", "less than ")
    .replaceAll(EN, " to ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Accessible name for a ₿ amount: always "bitcoin 0.7" (never the glyph, never "BTC"), the same
 * whether fonts loaded or not. NaN / ±∞ → "not available".
 */
export const nameBTC = (x: number, options?: Pick<FormatOptions, "detail">): string =>
  Number.isFinite(x)
    ? speakBtc(fmtBTC(x, { detail: options?.detail === true }), BTC)
    : NOT_AVAILABLE;

/**
 * Spoken range, in step with the display but never ambiguous: a same-sign negative range repeats
 * the sign ("minus bitcoin 0.7 to minus 0.4"), so it cannot be heard as −0.7 to +0.4 (Probe m2).
 */
export const nameBTCRange = (low: number, high: number): string => {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return NOT_AVAILABLE;
  const shown = fmtBTCRange(low, high);
  const lead = MINUS + BTC;
  if (shown.startsWith(lead) && shown.includes(EN)) {
    const [from = "", to = ""] = shown.slice(lead.length).split(EN);
    return `minus bitcoin ${from} to minus ${to}`;
  }
  return speakBtc(shown, BTC);
};

/**
 * Accessible name for a $ amount; NaN / ±∞ → "not available". Scientific amounts are said in words
 * with the currency at the end (Form): "1.23 times ten to the 21 dollars".
 */
export const nameUSD = (x: number): string => {
  if (!Number.isFinite(x)) return NOT_AVAILABLE;
  const sci = sciParts(toDec(Math.abs(x)));
  if (sci !== undefined) {
    return `${x < 0 ? "minus " : ""}${sci[0]} times ten to the ${sci[1]} dollars`;
  }
  return speakUnits(fmtUSD(x).replaceAll(MINUS, "minus ").replaceAll("<", "less than "));
};

export const hasSuffixBtc = (s: string): boolean => /\d\s?₿/.test(s);
