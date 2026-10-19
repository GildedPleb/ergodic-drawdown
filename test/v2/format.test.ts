import { expect, test } from "bun:test";

import {
  fmtBTC,
  fmtBTCChange,
  fmtBTCRange,
  fmtUSD,
  hasSuffixBtc,
} from "../../src/v2/design/format/money";

test("fmtBTC prefixes with no space", () => {
  expect(fmtBTC(13.1)).toBe("₿13.1");
  expect(fmtBTC(1.2)).toBe("₿1.2");
  expect(`${fmtBTC(1.2)}/yr`).toBe("₿1.2/yr");
});

test("fmtBTC negative uses U+2212 before the sign", () => {
  expect(fmtBTC(-0.4)).toBe("−₿0.4");
});

test("fmtBTC below one uses two significant figures", () => {
  expect(fmtBTC(0.42)).toBe("₿0.42");
  expect(fmtBTC(0.05)).toBe("₿0.05");
});

test("fmtBTC at least one uses one decimal and trims .0", () => {
  expect(fmtBTC(13)).toBe("₿13");
  expect(fmtBTC(13.14)).toBe("₿13.1");
});

test("fmtBTC under half a sat", () => {
  expect(fmtBTC(1e-10)).toBe("<₿0.00000001");
});

test("fmtBTCRange one prefix en dash", () => {
  expect(fmtBTCRange(0.4, 0.7)).toBe("₿0.4–0.7");
});

test("fmtBTCChange uses arrow", () => {
  expect(fmtBTCChange(0.4, 0.7)).toBe("₿0.4 → ₿0.7");
});

test("fmtUSD caps decimals and keeps cents under $10", () => {
  expect(fmtUSD(4.5)).toBe("$4.50");
  expect(fmtUSD(80000)).toBe("$80k");
  expect(fmtUSD(-400)).toBe("−$400");
});

test("hasSuffixBtc detects forbidden forms", () => {
  expect(hasSuffixBtc("13.1 ₿")).toBe(true);
  expect(hasSuffixBtc("13.1₿")).toBe(true);
  expect(hasSuffixBtc("₿13.1")).toBe(false);
});
