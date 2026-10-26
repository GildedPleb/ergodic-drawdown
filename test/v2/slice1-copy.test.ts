import { expect, test } from "bun:test";

import { strings } from "../../src/v2/app/strings";
import { spokenLabel } from "../../src/v2/design/primitives/LabelGlyphs/LabelGlyphs";

test("headline sentence and kicker match the handoff's example", () => {
  expect(
    strings.headline.sentence(
      { kind: "ninety", median: 1_200_000, low: 400_000, high: 3_100_000 },
      2066,
    ),
  ).toBe(
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

test("the clamp note names the limit used; text that isn't a number says so in two words (Form 2j)", () => {
  expect(strings.fields.limit(true, 1)).toBe("Max is 1");
  expect(strings.fields.numbersOnly).toBe("Numbers only");
  expect("invalid" in strings.fields).toBe(false); // the long generic message is retired
  expect(strings.fields.limit(false, 1.01)).toBe("Min is 1.01");
  expect(strings.fields.tooLarge).toBe("Too large"); // Form 2k
  expect(strings.fields.enterNumber).toBe("Enter a number"); // Form 2l
});

test("Form Storybook / 2j: no retired long invalid message anywhere in the front end, stories included", async () => {
  const { file, Glob } = await import("bun");
  // Built from parts so this file never carries the retired copy itself.
  const retired = [
    ["is still", "in use"],
    ["Your last", "value"],
    ["takes a", "number from"],
    ["takes a whole", "number"],
  ].map((parts) => parts.join(" "));
  const root = `${import.meta.dir}/../..`;
  const paths = [...new Glob("**/*.{ts,tsx,css,md,mdx}").scanSync({ cwd: `${root}/src/v2` })];
  expect(paths.length > 100).toBe(true);
  const hits: string[] = [];
  for (const path of paths) {
    const text = await file(`${root}/src/v2/${path}`).text();
    for (const phrase of retired) if (text.includes(phrase)) hits.push(`${path}: ${phrase}`);
  }
  expect(hits).toEqual([]);
  const story = await file(
    `${root}/src/v2/design/primitives/NumberField/NumberField.stories.tsx`,
  ).text();
  expect(story.includes('"Numbers only"')).toBe(true);
});

test("the drawn walk is spoken as runs: 3 up, 1 down", () => {
  expect(spokenLabel("\u{1F7E2}\u{1F7E2}\u{1F7E2}\u{1F534}")).toBe("3 up, 1 down");
});

test("the chart's spoken sentence names units as words; the shown one abbreviates", () => {
  const ends = [
    { kind: "ninety", median: 67_800_000, low: 2_420_000, high: 29_533_000_000 },
    2064,
  ] as const;
  expect(strings.headline.sentence(...ends).endsWith("between $2.42M and $29.5B.")).toBe(true);
  expect(
    strings.headline.spoken(...ends).endsWith("between $2.42 million and $29.5 billion."),
  ).toBe(true);
});

test("n18: the kicker counts futures in the singular for one sample", () => {
  expect(strings.headline.kicker(1, "CAGR")).toBe("From today \u00B7 1 future \u00B7 CAGR");
  expect(strings.headline.kicker(2, "CAGR")).toBe("From today \u00B7 2 futures \u00B7 CAGR");
  expect(strings.headline.kicker(1000, "CAGR")).toBe("From today \u00B7 1,000 futures \u00B7 CAGR");
});
