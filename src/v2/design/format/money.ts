/**
 * StackMath money formatting (SYSTEM.md §6, MVP-SPEC G3). INVIOLABLE: ₿ is a prefix like $.
 *
 * All rounding is half-up on the decimal value (via 15 significant digits and BigInt), never on
 * binary floats, so `$9.995` rounds to `$10` and exactly half a sat rounds up to 1 sat.
 * The unit (sats / ₿ tenths, cents / dollars / k / M) is chosen after rounding, so `$999.5` → `$1k`
 * and `0.99999999` → `₿1`.
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

export const fmtBTC = (x: number, options?: FormatOptions): string => {
  if (!Number.isFinite(x)) return EM;
  const prefix = btcPrefix(options);
  if (x === 0) return `${prefix}0`;
  const sign = x < 0 ? MINUS : "";
  const d = toDec(Math.abs(x));
  const sats = roundTo(d, 8);
  if (sats === 0n) return `<${prefix}0.00000001`;
  if (options?.detail === true) return `${sign}${prefix}${fixed(sats, 8)}`;
  if (sats < 100_000_000n) {
    const decimals = Math.min(8, 1 - leadExp(d));
    const n = roundTo(d, decimals);
    if (n < pow10(decimals)) return `${sign}${prefix}${fixed(n, decimals)}`;
  }
  return `${sign}${prefix}${fixed(roundTo(d, 1), 1)}`;
};

const usdBody = (d: Dec): string => {
  const cents = roundTo(d, 2);
  if (cents === 0n) return "<$0.01";
  if (cents < 1_000n) return `$${fixed(cents, 2, true)}`;
  const dollars = roundTo(d, 0);
  if (dollars < 1_000n) return `$${dollars.toString()}`;
  const k: Dec = { digits: d.digits, exp: d.exp - 3 };
  const tenthsK = roundTo(k, 1);
  if (tenthsK < 100n) return `$${fixed(tenthsK, 1)}k`;
  const wholeK = roundTo(k, 0);
  if (wholeK < 1_000n) return `$${wholeK.toString()}k`;
  const m: Dec = { digits: d.digits, exp: d.exp - 6 };
  const tenthsM = roundTo(m, 1);
  if (tenthsM < 100n) return `$${fixed(tenthsM, 1)}M`;
  return `$${group(roundTo(m, 0).toString())}M`;
};

export const fmtUSD = (x: number): string => {
  if (!Number.isFinite(x)) return EM;
  if (x === 0) return "$0";
  const body = usdBody(toDec(Math.abs(x)));
  return x < 0 && !body.startsWith("<") ? `${MINUS}${body}` : body;
};

/**
 * `₿0.4–0.7`: one prefix, en dash, no spaces. Equal ends collapse to one value.
 * Both negative: `−₿0.7–0.4` (one sign covers both). Crossing zero: each end keeps its own sign
 * and prefix, `−₿0.4–₿0.7`, so it never reads as both negative.
 */
export const fmtBTCRange = (low: number, high: number, options?: FormatOptions): string => {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return EM;
  const a = fmtBTC(low, options);
  const b = fmtBTC(high, options);
  if (a === b) return a;
  const prefix = btcPrefix(options);
  const negA = a.startsWith(MINUS);
  const negB = b.startsWith(MINUS);
  if (negA !== negB || a.startsWith("<") || b.startsWith("<")) return `${a}${EN}${b}`;
  const lead = negA ? MINUS + prefix : prefix;
  return `${lead}${a.slice(lead.length)}${EN}${b.slice(lead.length)}`;
};

export const fmtBTCChange = (from: number, to: number, options?: FormatOptions): string =>
  `${fmtBTC(from, options)} → ${fmtBTC(to, options)}`;

export const hasSuffixBtc = (s: string): boolean => /\d\s?₿/.test(s);
