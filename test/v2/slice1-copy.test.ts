import { expect, test } from "bun:test";

import { strings } from "../../src/v2/app/strings";
import { spokenLabel } from "../../src/v2/design/primitives/LabelGlyphs/LabelGlyphs";

test("headline sentence and kicker match the handoff's example", () => {
  expect(strings.headline.sentence(1_200_000, 2066, 400_000, 3_100_000)).toBe(
    "Bitcoin\u2019s median price reaches $1.2M by 2066; 9 in 10 futures end between $400k and $3.1M.",
  );
  expect(strings.headline.kicker(1000, "Power Law Regression Median")).toBe(
    "From today \u00B7 1,000 futures \u00B7 Power Law Regression Median",
  );
});

test("chart end label uses the $ range format", () => {
  expect(strings.chart.endLabel(1_200_000, 400_000, 3_100_000)).toBe(
    "\u20BF price \u00B7 $1.2M \u00B7 $400k\u20133.1M",
  );
});

test("clamp and invalid messages name the range and the value in use", () => {
  const { nouns } = strings.fields;
  expect(strings.fields.clamped(nouns.volatility, 0, 1, 1)).toBe(
    "Volatility goes from 0 to 1. We used 1.",
  );
  expect(strings.fields.invalid(nouns.epochs, "int", 1, 100, 10)).toBe(
    "Epochs take a whole number from 1 to 100. Your last value, 10, is still in use.",
  );
  expect(strings.fields.clamped(nouns.minMaxMultiple, 1.01, Infinity, 1.01)).toBe(
    "The +/- multiple goes from 1.01 up. We used 1.01.",
  );
});

test("the drawn walk is spoken as runs: 3 up, 1 down", () => {
  expect(spokenLabel("\u{1F7E2}\u{1F7E2}\u{1F7E2}\u{1F534}")).toBe("3 up, 1 down");
});
