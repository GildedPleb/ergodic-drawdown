import { expect, test } from "bun:test";

import {
  fmtBTC,
  fmtBTCChange,
  fmtBTCRange,
  fmtUSD,
  fmtUSDRange,
  hasSuffixBtc,
  nameBTC,
  nameBTCRange,
  nameUSD,
  nameUSDRange,
} from "../../src/v2/design/format/money";

const check = (rows: [string, string][]): void => {
  for (const [got, want] of rows) expect(got).toBe(want);
};

test("G3 SYSTEM §6 examples", () => {
  check([
    [fmtBTC(13.1), "₿13.1"],
    [fmtBTC(-0.4), "−₿0.4"],
    [`${fmtBTC(1.2)}/yr`, "₿1.2/yr"],
    [fmtBTCChange(0.4, 0.7), "₿0.4 → ₿0.7"],
    [fmtBTCRange(0.4, 0.7), "₿0.4–0.7"],
    [fmtBTC(0.42), "₿0.42"],
    [fmtBTC(0.0021), "₿0.0021"],
    [fmtBTC(0.0000055), "₿0.0000055"],
    [fmtUSD(90_000), "$90k"],
    [fmtUSD(1_200_000), "$1.2M"],
    [fmtUSD(240), "$240"],
    [fmtUSD(4.5), "$5"],
    [fmtUSD(0.45), "$0.45"],
  ]);
});

test("G3 ₿ precision: whole sats, 1 decimal at ₿1+, 2 sig figs below", () => {
  check([
    [fmtBTC(13), "₿13"],
    [fmtBTC(13.14), "₿13.1"],
    [fmtBTC(13.15), "₿13.2"],
    [fmtBTC(1234.56), "₿1,234.6"],
    [fmtBTC(0.425), "₿0.43"],
    [fmtBTC(0.0995), "₿0.1"],
    [fmtBTC(0.000000014), "₿0.00000001"],
    [fmtBTC(0.000000016), "₿0.00000002"],
  ]);
});

test("G3 edge: zero and negative zero", () => {
  check([
    [fmtBTC(0), "₿0"],
    [fmtBTC(-0), "₿0"],
    [fmtUSD(0), "$0"],
    [fmtUSD(-0), "$0"],
  ]);
});

test("G3 edge: half a sat rounds up; under half a sat is <₿0.00000001 with no sign", () => {
  check([
    [fmtBTC(0.000000005), "₿0.00000001"],
    [fmtBTC(-0.000000005), "−₿0.00000001"],
    [fmtBTC(0.0000000049), "<₿0.00000001"],
    [fmtBTC(1e-9), "<₿0.00000001"],
    [fmtBTC(-1e-9), "<₿0.00000001"],
  ]);
});

test("G3 edge: 0.99999999 next to the ₿1 boundary", () => {
  check([
    [fmtBTC(0.99999999), "₿1"],
    [fmtBTC(0.995), "₿1"],
    [fmtBTC(0.994), "₿0.99"],
    [fmtBTC(0.99999999, { detail: true }), "₿0.99999999"],
    [fmtBTC(1), "₿1"],
    [fmtBTC(1.05), "₿1.1"],
  ]);
});

test("G3 edge: $999.5 → $1k, $9.995 → $10, unit chosen after rounding, full digits below $10k, k/M at 3 significant figures from $10k (G3 ruling 2)", () => {
  check([
    [fmtUSD(999.5), "$1,000"],
    [fmtUSD(999.49), "$999"],
    [fmtUSD(9.995), "$10"],
    [fmtUSD(9.994), "$10"],
    [fmtUSD(10), "$10"],
    [fmtUSD(1_000), "$1,000"],
    [fmtUSD(1_250), "$1,250"],
    [fmtUSD(9_950), "$9,950"],
    [fmtUSD(9_999.4), "$9,999"],
    [fmtUSD(9_999.5), "$10,000"],
    [fmtUSD(9_999.99), "$10,000"],
    [fmtUSD(10_000), "$10k"],
    [fmtUSD(99_950), "$100k"],
    [fmtUSD(85_400), "$85.4k"],
    [fmtUSD(999_500), "$1M"],
    [fmtUSD(12_340_000), "$12.3M"],
    [fmtUSD(2_500_000_000), "$2.5B"],
    [fmtUSD(0.004), "<$0.01"],
    [fmtUSD(-4.5), "−$5"],
    [fmtUSD(-0.45), "−$0.45"],
    [fmtUSD(-90_000), "−$90k"],
  ]);
});

test("G3 edge: NaN and ±Infinity are an em dash (Form)", () => {
  for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    expect(fmtBTC(v)).toBe("—");
    expect(fmtUSD(v)).toBe("—");
    expect(fmtBTCRange(v, 1)).toBe("—");
    expect(fmtBTCRange(0, v)).toBe("—");
  }
});

test("G3 / Form m9: ranges: wider end's precision, raw-value zero crossing, tiny ends keep their digits (equal ends, ₿1 boundary, negative, crossing zero)", () => {
  check([
    [fmtBTCRange(0.4, 0.4), "₿0.4"],
    [fmtBTCRange(0.4, 0.40000001), "₿0.4"],
    [fmtBTCRange(0.42, 1.3), "₿0.4–1.3"],
    [fmtBTCRange(0.0021, 0.42), "₿0.0021–0.42"],
    [fmtBTCRange(0.99999999, 1.2), "₿1–1.2"],
    [fmtBTCRange(-0.7, -0.4), "−₿0.7–0.4"],
    [fmtBTCRange(-0.4, -0.7), "−₿0.7–0.4"],
    [fmtBTCRange(0.7, 0.4), "₿0.4–0.7"],
    [fmtBTCRange(-0.4, 0.7), "−₿0.4 to ₿0.7"],
    [fmtBTCRange(0.7, -0.4), "−₿0.4 to ₿0.7"],
    [fmtBTCRange(0, 0.7), "₿0–0.7"],
    [fmtBTCRange(1, 13), "₿1–13"],
    [fmtBTCRange(1e-9, 0.7), "₿0–0.7"],
    [fmtBTCRange(-0.0021, 0.42), "−₿0.0021 to ₿0.42"],
    [fmtBTCRange(0.42, -0.0021), "−₿0.0021 to ₿0.42"],
  ]);
});

test("G3 Form: cross-zero never puts an en dash beside a minus", () => {
  for (const [lo, hi] of [
    [-0.4, 0.7],
    [-13.1, 2],
    [-0.21, 0.42],
    [-0.0021, 0.42],
  ] as const) {
    const r = fmtBTCRange(lo, hi);
    expect(r.includes("\u2013\u2212")).toBe(false);
    expect(r.includes(" to ")).toBe(true);
    expect(r.split("₿").length - 1).toBe(2);
  }
});

test("G3 Form: no trailing .0 for ₿ or $", () => {
  check([
    [fmtBTC(1), "₿1"],
    [fmtBTC(13), "₿13"],
    [fmtBTC(13.04), "₿13"],
    [fmtBTC(13.1), "₿13.1"],
    [fmtBTC(0.999), "₿1"],
    [fmtUSD(1), "$1"],
    [fmtUSD(13), "$13"],
    [fmtUSD(13.1), "$13"],
    [fmtUSD(4.1), "$4"],
    [fmtUSD(4), "$4"],
    [fmtUSD(1_000), "$1,000"],
    [fmtUSD(1_040), "$1,040"],
    [fmtUSD(10_000), "$10k"],
    [fmtUSD(1_000_000), "$1M"],
    [fmtUSD(-1), "−$1"],
  ]);
});

test("G3 detail mode shows exact sats", () => {
  check([
    [fmtBTC(0.00000546, { detail: true }), "₿0.00000546"],
    [fmtBTC(0.42, { detail: true }), "₿0.42"],
    [fmtBTC(1.23456789, { detail: true }), "₿1.23456789"],
    [fmtBTC(-0.123456785, { detail: true }), "−₿0.12345679"],
  ]);
});

test("G3 fonts-failed mode prefixes BTC (story 197)", () => {
  const ff = { fontsFailed: true };
  check([
    [fmtBTC(13.1, ff), "BTC\u00A013.1"],
    [fmtBTC(-0.4, ff), "−BTC\u00A00.4"],
    [fmtBTCRange(0.4, 0.7, ff), "BTC\u00A00.4–0.7"],
    [fmtBTC(0.7, ff), "BTC\u00A00.7"],
    [fmtBTCRange(-0.4, 0.7, ff), "−BTC\u00A00.4 to BTC\u00A00.7"],
    [fmtBTCChange(0.4, 0.7, ff), "BTC\u00A00.4 → BTC\u00A00.7"],
  ]);
  expect(fmtBTC(13.1, ff).includes("₿")).toBe(false);
});

test("G3 Form: accessible name is always 'bitcoin 0.7', regardless of display", () => {
  check([
    [nameBTC(0.7), "bitcoin 0.7"],
    [nameBTC(-0.4), "minus bitcoin 0.4"],
    [nameBTC(0), "bitcoin 0"],
    [nameBTC(1e-9), "less than bitcoin 0.00000001"],
    [nameBTC(0.00000546, { detail: true }), "bitcoin 0.00000546"],
    [nameBTCRange(0.4, 0.7), "bitcoin 0.4 to 0.7"],
    [nameBTCRange(-0.4, 0.7), "minus bitcoin 0.4 to bitcoin 0.7"],
    // Probe m2: a same-sign negative range repeats the sign when spoken.
    [nameBTCRange(-0.7, -0.4), "minus bitcoin 0.7 to minus 0.4"],
    [nameBTCRange(-0.0021, 0.42), "minus bitcoin 0.0021 to bitcoin 0.42"],
    [nameBTCRange(1e-9, 0.7), "bitcoin 0 to 0.7"],
    [nameUSD(-4.5), "minus $5"],
    [nameUSD(-0.45), "minus $0.45"],
  ]);
  expect(nameBTC(0.7)).toBe(nameBTC(0.7, { detail: false }));
  for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    expect(nameBTC(v)).toBe("not available");
    expect(nameUSD(v)).toBe("not available");
    expect(nameBTCRange(v, 1)).toBe("not available");
  }
});

test("no output ever puts ₿ after a digit", () => {
  const samples = [0, 1e-9, 5e-9, 0.42, 0.99999999, 13.1, -0.4, 1234.5];
  for (const v of samples) {
    expect(hasSuffixBtc(fmtBTC(v))).toBe(false);
    expect(hasSuffixBtc(fmtBTCRange(-v, v))).toBe(false);
  }
  expect(hasSuffixBtc("13.1₿")).toBe(true);
  expect(hasSuffixBtc("13.1 ₿")).toBe(true);
});

test("Amount: fonts-failed display is 'BTC 0.7' but the spoken name stays 'bitcoin 0.7'; NaN is '—' / 'not available'", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Amount } = await import("../../src/v2/design/primitives/Amount/Amount");
  const ok = renderToStaticMarkup(createElement(Amount, { value: 0.7, unit: "btc" }));
  const ff = renderToStaticMarkup(
    createElement(Amount, { value: 0.7, unit: "btc", fontsFailed: true }),
  );
  expect((ok ?? "").includes(">bitcoin 0.7<")).toBe(true);
  expect((ok ?? "").includes('aria-hidden="true">₿0.7<')).toBe(true);
  expect((ff ?? "").includes(">bitcoin 0.7<")).toBe(true);
  expect((ff ?? "").includes('aria-hidden="true">BTC\u00A00.7<')).toBe(true);
  const na = renderToStaticMarkup(createElement(Amount, { value: Number.NaN, unit: "btc" }));
  expect((na ?? "").includes(">not available<")).toBe(true);
  expect((na ?? "").includes('aria-hidden="true">—<')).toBe(true);
});

test("Form G3 2026-10-19: whole dollars from $1 below $10,000; cents only below $1; $9,999.99 never $10k", () => {
  check([
    [fmtUSD(12), "$12"],
    [fmtUSD(12.345), "$12"],
    [fmtUSD(1_040), "$1,040"],
    [fmtUSD(9_950), "$9,950"],
    [fmtUSD(9_999.99), "$10,000"],
    [fmtUSD(10_000), "$10k"],
    [fmtUSD(85_400), "$85.4k"],
    [fmtUSD(1_234_567), "$1.23M"],
    [fmtUSD(0.45), "$0.45"],
    [fmtUSD(0.5), "$0.50"],
    [fmtUSD(0.999), "$1"],
    [fmtUSD(1), "$1"],
    [fmtUSD(0.004), "<$0.01"],
  ]);
  for (const v of [1, 4.5, 12.345, 999.99, 9_999.99]) expect(fmtUSD(v).includes(".")).toBe(false);
});

test("Form G3 2026-10-19: a same-sign range with an end below 1 sat stays compact", () => {
  check([
    [fmtBTCRange(1e-9, 0.7), "₿0–0.7"],
    [fmtBTCRange(0.7, 1e-9), "₿0–0.7"],
    [nameBTCRange(1e-9, 0.7), "bitcoin 0 to 0.7"],
    [fmtBTCRange(-0.7, -1e-9), "−₿0.7–0"],
    [nameBTCRange(-0.7, -1e-9), "minus bitcoin 0.7 to minus 0"],
  ]);
});

test("V32 Gap 5: a $ range has one prefix and an en dash, each end in its own unit", () => {
  check([
    [fmtUSDRange(400_000, 3_100_000), "$400k–3.1M"],
    [fmtUSDRange(3_100_000, 400_000), "$400k–3.1M"],
    [fmtUSDRange(240, 1_040), "$240–1,040"],
    [fmtUSDRange(85_400, 85_400), "$85.4k"],
    [fmtUSDRange(-5, 10), "−$5 to $10"],
    [fmtUSDRange(-10, -5), "−$10–5"],
    [fmtUSDRange(Number.NaN, 5), "—"],
    [nameUSDRange(400_000, 3_100_000), "$400 thousand to $3.1 million"],
    [nameUSDRange(-10, -5), "minus $10 to minus $5"],
    [nameUSDRange(-5, 10), "minus $5 to $10"],
    [nameUSDRange(Number.NaN, 5), "not available"],
  ]);
});

test("Slice 1 review (5): money steps up to B and T at 3 significant figures, never $29,533M", () => {
  check([
    [fmtUSD(29_533_000_000), "$29.5B"],
    [fmtUSD(999_499_999), "$999M"],
    [fmtUSD(999_500_000), "$1B"],
    [fmtUSD(1_234_000_000), "$1.23B"],
    [fmtUSD(999_950_000_000), "$1T"],
    [fmtUSD(1_234_000_000_000), "$1.23T"],
    [fmtUSD(1_234_000_000_000_000), "$1,230T"],
    [fmtUSD(45_600_000_000_000_000), "$45,600T"],
    [fmtUSD(999_500_000_000_000), "$1,000T"],
    [fmtUSD(3.16e46), "$3.16\u00D710\u2074\u2076"],
    [fmtUSDRange(999e12, 1.234e15), "$999T\u20131,230T"],
    [fmtUSD(-29_533_000_000), "\u2212$29.5B"],
    [fmtUSDRange(59_500_000, 29_533_000_000), "$59.5M\u201329.5B"],
  ]);
});

test("Slice 1 review (5): the spoken form says the unit as a word", () => {
  check([
    [nameUSD(29_533_000_000), "$29.5 billion"],
    [nameUSD(1_234_000_000_000), "$1.23 trillion"],
    [nameUSD(67_800_000), "$67.8 million"],
    [nameUSD(85_400), "$85.4 thousand"],
    [nameUSD(-29_533_000_000), "minus $29.5 billion"],
    [nameUSD(9_950), "$9,950"],
    [nameUSDRange(59_500_000, 29_533_000_000), "$59.5 million to $29.5 billion"],
    // n4: past $999T the T count grows in grouped digits, 3 significant figures, said the same way.
    [nameUSD(1_234_000_000_000_000), "$1,230 trillion"],
    [nameUSD(45_600_000_000_000_000), "$45,600 trillion"],
    [nameUSDRange(999e12, 1.234e15), "$999 trillion to $1,230 trillion"],
    [nameUSDRange(3_100_000, 400_000), "$400 thousand to $3.1 million"],
    [nameUSDRange(85_400, 85_400), "$85.4 thousand"],
    [nameUSDRange(240, 1_040), "$240 to $1,040"],
    [nameUSDRange(0.004, 5), "less than $0.01 to $5"],
    [nameUSDRange(-2e9, -1e9), "minus $2 billion to minus $1 billion"],
  ]);
});

// $1,000,000T = 10¹⁸: Form's T bounds ($1,000T–$999,999T grouped) set the switch.
const T = 1e12;

test("n4 revision: $1,000T–$999,000T stay grouped T; from $1,000,000T scientific at 3 significant figures", () => {
  check([
    [fmtUSD(1_000 * T), "$1,000T"],
    [fmtUSD(999_000 * T), "$999,000T"],
    [fmtUSD(999_499 * T), "$999,000T"],
    // 999,999.5T rounds to 1,000,000T, so it takes the scientific form, as does 999,500T.
    [fmtUSD(999_999.5 * T), "$1.00\u00D710\u00B9\u2078"],
    [fmtUSD(999_500 * T), "$1.00\u00D710\u00B9\u2078"],
    [fmtUSD(1_000_000 * T), "$1.00\u00D710\u00B9\u2078"],
    [fmtUSD(1e21), "$1.00\u00D710\u00B2\u00B9"],
    [fmtUSD(1.234e21), "$1.23\u00D710\u00B2\u00B9"],
    [fmtUSD(9.995e22), "$1.00\u00D710\u00B2\u00B3"],
    [fmtUSD(9.994e22), "$9.99\u00D710\u00B2\u00B2"],
    [fmtUSD(4.56e100), "$4.56\u00D710\u00B9\u2070\u2070"],
    [fmtUSD(1e308), "$1.00\u00D710\u00B3\u2070\u2078"],
    [fmtUSD(-1.234e21), "\u2212$1.23\u00D710\u00B2\u00B9"],
    [fmtUSDRange(999_000 * T, 1.234e21), "$999,000T\u20131.23\u00D710\u00B2\u00B9"],
    [fmtUSDRange(1.234e21, 4.56e22), "$1.23\u00D710\u00B2\u00B9\u20134.56\u00D710\u00B2\u00B2"],
    [fmtUSDRange(1e21, 1.004e21), "$1.00\u00D710\u00B2\u00B9"],
  ]);
});

test("n4 revision: scientific amounts are spoken in words, currency on both ends of a range", () => {
  check([
    [nameUSD(1.234e21), "1.23 times ten to the 21 dollars"],
    [nameUSD(999_999.5 * T), "1.00 times ten to the 18 dollars"],
    [nameUSD(1e308), "1.00 times ten to the 308 dollars"],
    [nameUSD(-1.234e21), "minus 1.23 times ten to the 21 dollars"],
    [nameUSD(999_000 * T), "$999,000 trillion"],
    [nameUSDRange(999_000 * T, 1.234e21), "$999,000 trillion to 1.23 times ten to the 21 dollars"],
    [nameUSDRange(1_000 * T, 999_999.5 * T), "$1,000 trillion to 1.00 times ten to the 18 dollars"],
    [
      nameUSDRange(1.234e21, 4.56e22),
      "1.23 times ten to the 21 dollars to 4.56 times ten to the 22 dollars",
    ],
    [nameUSDRange(1e21, 1.004e21), "1.00 times ten to the 21 dollars"],
  ]);
});
