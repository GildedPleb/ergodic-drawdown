/** StackMath money formatting — SYSTEM.md §6 / BOOK.md. INVIOLABLE. */

const SAT = 1e-8;
const MINUS = "\u2212";
const BTC = "\u20BF";
const EN = "\u2013";

const roundToSats = (abs: number): number => Math.round(abs / SAT) * SAT;

const formatBelowOne = (abs: number): string => {
  if (abs < SAT / 2) return `<${BTC}0.00000001`;
  const rounded = roundToSats(abs);
  if (rounded === 0) return `<${BTC}0.00000001`;
  const digits = Math.floor(Math.log10(rounded));
  const scale = 10 ** (digits - 1);
  const sig = Math.round(rounded / scale) * scale;
  const s = sig.toFixed(8).replace(/\.?0+$/, "");
  return `${BTC}${s}`;
};

const formatAtLeastOne = (abs: number): string => {
  const rounded = roundToSats(abs);
  return `${BTC}${rounded.toFixed(1).replace(/\.0$/, "")}`;
};

export const fmtBTC = (x: number): string => {
  if (!Number.isFinite(x)) return `${BTC}?`;
  const sign = x < 0 ? MINUS : "";
  const abs = Math.abs(x);
  if (abs < 1) return `${sign}${formatBelowOne(abs)}`;
  return `${sign}${formatAtLeastOne(abs)}`;
};

export const fmtUSD = (x: number): string => {
  if (!Number.isFinite(x)) return "$?";
  const sign = x < 0 ? MINUS : "";
  const abs = Math.abs(x);
  const cents = Math.round(abs * 100) / 100;
  if (cents >= 1_000_000) {
    const m = cents / 1_000_000;
    return `${sign}$${m.toFixed(m >= 10 ? 0 : 1).replace(/\.0$/, "")}M`;
  }
  if (cents >= 1_000) {
    const k = cents / 1_000;
    return `${sign}$${k.toFixed(k >= 10 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  if (cents >= 10) {
    return `${sign}$${Math.round(cents).toLocaleString("en-US")}`;
  }
  const body = cents.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${body}`;
};

export const fmtBTCRange = (from: number, to: number): string => {
  const a = fmtBTC(from);
  const b = fmtBTC(to);
  if (a.startsWith("<") || b.startsWith("<")) return `${a}${EN}${b}`;
  const strip = (s: string): string => s.replace(new RegExp(`^[${MINUS}-]?${BTC}`), "");
  const prefix = a.startsWith(MINUS) ? MINUS + BTC : BTC;
  return `${prefix}${strip(a)}${EN}${strip(b)}`;
};

export const fmtBTCChange = (from: number, to: number): string => `${fmtBTC(from)} → ${fmtBTC(to)}`;

export const hasSuffixBtc = (s: string): boolean => /\d\s?₿/.test(s);
