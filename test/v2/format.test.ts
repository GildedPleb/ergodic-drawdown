import { expect, test } from "bun:test";

import {
  fmtBTC,
  fmtBTCChange,
  fmtBTCRange,
  fmtUSD,
  hasSuffixBtc,
  nameBTC,
  nameBTCRange,
  nameUSD,
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
    [fmtUSD(4.5), "$4.50"],
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

test("G3 edge: $999.5 → $1k, $9.995 → $10, unit chosen after rounding", () => {
  check([
    [fmtUSD(999.5), "$1k"],
    [fmtUSD(999.49), "$999"],
    [fmtUSD(9.995), "$10"],
    [fmtUSD(9.994), "$9.99"],
    [fmtUSD(10), "$10"],
    [fmtUSD(1_000), "$1k"],
    [fmtUSD(1_250), "$1.3k"],
    [fmtUSD(9_950), "$10k"],
    [fmtUSD(999_500), "$1M"],
    [fmtUSD(12_340_000), "$12M"],
    [fmtUSD(2_500_000_000), "$2,500M"],
    [fmtUSD(0.004), "<$0.01"],
    [fmtUSD(-4.5), "−$4.50"],
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

test("G3 edge: ranges (equal ends, ₿1 boundary, negative, crossing zero)", () => {
  check([
    [fmtBTCRange(0.4, 0.4), "₿0.4"],
    [fmtBTCRange(0.4, 0.40000001), "₿0.4"],
    [fmtBTCRange(0.42, 1.3), "₿0.42–1.3"],
    [fmtBTCRange(0.99999999, 1.2), "₿1–1.2"],
    [fmtBTCRange(-0.7, -0.4), "−₿0.7–0.4"],
    [fmtBTCRange(-0.4, -0.7), "−₿0.7–0.4"],
    [fmtBTCRange(0.7, 0.4), "₿0.4–0.7"],
    [fmtBTCRange(-0.4, 0.7), "−₿0.4 to ₿0.7"],
    [fmtBTCRange(0.7, -0.4), "−₿0.4 to ₿0.7"],
    [fmtBTCRange(0, 0.7), "₿0–0.7"],
    [fmtBTCRange(1, 13), "₿1–13"],
    [fmtBTCRange(1e-9, 0.7), "<₿0.00000001 to ₿0.7"],
  ]);
});

test("G3 Form: cross-zero never puts an en dash beside a minus", () => {
  for (const [lo, hi] of [
    [-0.4, 0.7],
    [-13.1, 2],
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
    [fmtUSD(4.1), "$4.10"],
    [fmtUSD(4), "$4"],
    [fmtUSD(1_000), "$1k"],
    [fmtUSD(1_040), "$1k"],
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
    [nameUSD(-4.5), "minus $4.50"],
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
