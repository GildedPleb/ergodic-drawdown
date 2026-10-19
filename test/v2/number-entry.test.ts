/** V32-BUILD §1g (Probe M3 / FL-001): the pure entry rules every NumberField commits through. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { NumberField } from "../../src/v2/design/primitives/NumberField";
import {
  normalizeNumberText,
  parseNumber,
  resolveEntry,
  stepValue,
} from "../../src/v2/design/primitives/NumberField/entry";

const VOL = { min: 0, max: 1 };
const FLOOR = { min: 1.01, max: Number.POSITIVE_INFINITY };

test("a value outside the accepted range commits the nearest bound and says so", () => {
  expect(resolveEntry("4", "float", VOL, null)).toEqual({ kind: "clamped", value: 1, typed: 4 });
  expect(resolveEntry("-2", "float", VOL, null)).toEqual({ kind: "clamped", value: 0, typed: -2 });
});

test("an Infinity bound never clamps; only the finite side does", () => {
  expect(resolveEntry("1e6", "float", FLOOR, null)).toEqual({ kind: "ok", value: 1_000_000 });
  expect(resolveEntry("0.5", "float", FLOOR, null)).toEqual({
    kind: "clamped",
    value: 1.01,
    typed: 0.5,
  });
});

test("unparseable text is invalid and commits nothing (never NaN)", () => {
  for (const text of ["abc", "1e", "12abc", "--1", "Infinity", "1.5"]) {
    expect(resolveEntry(text, text === "1.5" ? "int" : "float", VOL, null)).toEqual({
      kind: "invalid",
    });
  }
});

test("empty commits the field's emptyValue, or is invalid without one", () => {
  expect(resolveEntry("", "int", { min: 0, max: 10_000 }, 1000)).toEqual({
    kind: "ok",
    value: 1000,
  });
  expect(resolveEntry("  ", "float", VOL, null)).toEqual({ kind: "invalid" });
});

test("Postel text: separators and U+2212 normalise before the strict parse", () => {
  expect(normalizeNumberText("1,000 000\u00A0\u202F\u2009")).toBe("1000000");
  expect(parseNumber("\u22120.4", "float")).toBe(-0.4);
  expect(parseNumber("2 000", "int")).toBe(2000);
});

test("a step moves by step (×10 for PgUp/PgDn), clamps, and keeps the step's decimals", () => {
  expect(stepValue(0.1, 1, 0.005, VOL)).toBe(0.105);
  expect(stepValue(0.995, 1, 0.005, VOL, true)).toBe(1);
  expect(stepValue(10, -1, 1, { min: 1, max: 100 }, true)).toBe(1);
});

test("the message slot is always mounted as a polite live region and is undescribed until used", () => {
  const html = renderToStaticMarkup(
    createElement(NumberField, { id: "f", label: "Volatility (0-1):", value: 0.1, bounds: VOL }),
  );
  expect(html.includes('id="f-message" aria-live="polite"')).toBe(true);
  expect(html.includes("aria-describedby")).toBe(false);
  expect(html.includes('aria-valuemin="0" aria-valuemax="1"')).toBe(true);
});
