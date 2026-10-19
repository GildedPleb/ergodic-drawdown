/**
 * Form B3 (one file to keep the isolated suite inside its wall budget):
 * 1. main's source literals vs the G12 schema; 2. keystroke parity; 3. the m7 text parser.
 *
 * Keystroke parity. The same keystroke/blur sequences drive main's useSettledNumber hook
 * (mounted for real) and v2's createSettledNumber; drafts after every step and the commit stream
 * must be identical, using the accept/parse/emptyValue rules from the G12 schema.
 */
import "../dom-shim.js";

import { file } from "bun";
import { act, createElement, type JSX, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "bun:test";

import { parseCanonicalInteger, useSettledNumber } from "../../src/components/input/settled-number";
import {
  DEFAULT_EPOCH_COUNT,
  DEFAULT_SIMULATION_COUNT,
  MAX_SAMPLE_COUNT,
} from "../../src/constants";
import { inputLabels } from "../../src/content";
import { modelsPaneSchema } from "../../src/v2/app/models";
import {
  createSettledNumber,
  normalizeNumberText,
  parseCanonicalInteger as parseCanonicalIntegerV2,
  parseNumber,
} from "../../src/v2/design/primitives/NumberField/settle";

/** A typed text, or "<blur>". */
type Step = string;
type Spec = {
  accept: { min: number; max: number };
  emptyValue: number | null;
  parse: "float" | "int";
  default: number;
};

const runMain = async (spec: Spec, steps: readonly Step[]) => {
  const commits: number[] = [];
  const drafts: string[] = [];
  let api: { blur: () => void; change: (t: string) => void; draft: string } | null = null;
  const Harness = (): JSX.Element => {
    const [value, setValue] = useState(spec.default);
    api = useSettledNumber({
      accept: (n) => n >= spec.accept.min && n <= spec.accept.max,
      commit: (n) => {
        commits.push(n);
        setValue(n);
      },
      ...(spec.emptyValue === null ? {} : { emptyValue: spec.emptyValue }),
      parse: spec.parse === "int" ? parseCanonicalInteger : Number.parseFloat,
      value,
    });
    return createElement("div");
  };
  const root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(createElement(Harness));
  });
  const live = () => {
    if (api === null) throw new Error("not mounted");
    return api;
  };
  for (const step of steps) {
    await act(async () => {
      if (step === "<blur>") live().blur();
      else live().change(step);
    });
    drafts.push(live().draft);
  }
  await act(async () => {
    root.unmount();
  });
  return { commits, drafts };
};

const runV2 = (spec: Spec, steps: readonly Step[]) => {
  const commits: number[] = [];
  const drafts: string[] = [];
  let value = spec.default;
  const field = createSettledNumber(spec.default, {
    rule: {
      kind: "settle",
      accept: (n) => n >= spec.accept.min && n <= spec.accept.max,
      emptyValue: spec.emptyValue,
    },
    parse: spec.parse,
    commit: (n) => {
      commits.push(n);
      value = n;
    },
    getValue: () => value,
  });
  for (const step of steps) {
    if (step === "<blur>") field.blur();
    else field.change(step);
    field.sync(value);
    drafts.push(field.draft());
  }
  return { commits, drafts };
};

const c = modelsPaneSchema.controls;
const FIELDS: Record<string, Spec> = {
  volatility: c.volatility,
  samples: c.samples,
  epochs: c.epochs,
};

const SEQUENCES: readonly (readonly Step[])[] = [
  ["4", "<blur>"],
  ["0", "0.", "0.2", "0.25", "<blur>"],
  ["", "<blur>"],
  ["9", "99", "999", "9999", "99999", "<blur>"],
  ["1", "10", "100", "<blur>"],
  ["101", "<blur>"],
  ["NaN", "<blur>"],
  ["0", "<blur>"],
  ["1e3", "<blur>"],
  ["-", "-1", "<blur>"],
  ["30", "3", "", "<blur>"],
  ["5", "50", "500", "5000", "<blur>", "", "<blur>"],
];

for (const [name, spec] of Object.entries(FIELDS)) {
  test(`${name}: v2 drafts and commits match main's useSettledNumber keystroke for keystroke`, async () => {
    for (const steps of SEQUENCES) {
      const main = await runMain(spec, steps);
      const v2 = runV2(spec, steps);
      expect({ steps, ...v2 }).toEqual({ steps, ...main });
    }
  });
}

test("Form B3 cases: epoch 100 ok, samples 0 ok, empty samples → 1000, vol 4 / samples 99999 / epoch NaN rejected", async () => {
  const epochs = await runMain(c.epochs, ["100", "<blur>"]);
  expect(epochs.commits).toEqual([100]);
  const samples0 = runV2(c.samples, ["0", "<blur>"]);
  expect(samples0.commits).toEqual([0]);
  const empty = runV2({ ...c.samples, default: 500 }, ["", "<blur>"]);
  expect(empty.drafts.at(-1)).toBe("1000");
  expect(empty.commits).toEqual([1000]);
  expect(runV2(c.volatility, ["4", "<blur>"]).commits).toEqual([]);
  expect(runV2(c.samples, ["99999", "<blur>"]).commits).toEqual([]);
  expect(runV2(c.epochs, ["NaN", "<blur>"]).drafts.at(-1)).toBe(String(c.epochs.default));
});

/**
 * Form B3 / parity diff 7: the G12 schema must not be self-referential. Every literal main keeps
 * inline in its Models-pane components (steps, accept ranges, emptyValue, parse, the +/- floor,
 * defaults, the default walk) is read back here from main's own source and compared with the schema.
 */
const src = (p: string): Promise<string> => file(`${import.meta.dir}/../../src/${p}`).text();
const CONSTANTS: Record<string, number> = {
  DEFAULT_EPOCH_COUNT,
  DEFAULT_SIMULATION_COUNT,
  MAX_SAMPLE_COUNT,
};

const num = (token: string | undefined): number => {
  if (token === undefined) throw new Error("no match in main's source");
  const known = CONSTANTS[token];
  return known ?? Number(token);
};

const one = (text: string, re: RegExp): RegExpExecArray => {
  const m = re.exec(text);
  if (m === null) throw new Error(`main's source no longer matches ${re}`);
  return m;
};

const settled = (text: string) => {
  const accept = one(text, /accept: \(next\) => next >= ([\w.]+) && next <= ([\w.]+)/);
  const parse = one(text, /parse: (Number\.parseFloat|parseCanonicalInteger)/)[1];
  const empty = /emptyValue: ([\w.]+)/.exec(text)?.[1];
  return {
    accept: { min: num(accept[1]), max: num(accept[2]) },
    parse: parse === "parseCanonicalInteger" ? "int" : "float",
    emptyValue: empty === undefined ? null : num(empty),
  };
};

const attr = (text: string, name: string): number =>
  num(
    one(text, new RegExp(`\\b${name}=(?:"([\\w.]+)"|\\{([\\w.]+)\\})`))
      .slice(1)
      .find(Boolean),
  );

test("volatility, samples and epoch acceptance match main's useSettledNumber calls", async () => {
  const vol = await src("components/input/volatility.tsx");
  const samples = await src("components/input/samples.tsx");
  const epoch = await src("components/input/epoch.tsx");
  for (const [text, control] of [
    [vol, c.volatility],
    [samples, c.samples],
    [epoch, c.epochs],
  ] as const) {
    const s = settled(text);
    expect(control.accept).toEqual(s.accept);
    expect(control.parse).toBe(s.parse);
    expect(control.emptyValue).toBe(s.emptyValue);
    expect(control.min).toBe(attr(text, "min"));
  }
  expect(c.volatility.max).toBe(attr(vol, "max"));
  expect(c.samples.max).toBe(attr(samples, "max"));
  expect(c.epochs.max).toBe(attr(epoch, "max"));
  const step = one(vol, /walk === "(\w+)" \? ([\d.]+) : ([\d.]+)/);
  expect(step[1]).toBe("Bubble");
  expect(c.volatility.stepBubble).toBe(num(step[2]));
  expect(c.volatility.stepOther).toBe(num(step[3]));
});

test("model variable and +/- rules, steps and floor match main's model.tsx", async () => {
  const model = await src("components/input/model.tsx");
  one(model, /value <= modelMap\[model\]\.rangeMax && value >= modelMap\[model\]\.rangeMin/);
  expect(c.variable.rule).toBe("live-range");
  const floor = one(model, /if \(value < ([\d.]+)\) setMinMaxMultiple\(([\d.]+)\)/);
  expect(c.minMaxMultiple.floor).toBe(num(floor[1]));
  expect(c.minMaxMultiple.floor).toBe(num(floor[2]));
  expect(c.minMaxMultiple.min).toBe(
    num(one(model, /id="minMaxMultiple"[\s\S]*?min="([\d.]+)"/)[1]),
  );
  expect(c.minMaxMultiple.step).toBe(
    Number(one(model, /id="minMaxMultiple"[\s\S]*?step="([\d.]+)"/)[1]),
  );
  expect(c.variable.step).toBe(num(one(model, /id="modelVariable"[\s\S]*?step="([\d.]+)"/)[1]));
});

test("defaults and the default walk match main's ModelProvider useState calls", async () => {
  const ctx = await src("contexts/model.tsx");
  const state = (name: string): string =>
    one(ctx, new RegExp(`\\[${name}, set\\w+\\] = useState<\\w+>\\(([^)]+)\\)`))[1] ?? "";

  expect(modelsPaneSchema.defaultWalk).toBe(JSON.parse(state("walk")));
  expect(c.minMaxMultiple.default).toBe(num(state("minMaxMultiple")));
  expect(c.volatility.default).toBe(num(state("volatility")));
  expect(c.variable.default).toBe(num(state("variable")));
  expect(c.samples.default).toBe(num(state("samples")));
  expect(c.epochs.default).toBe(num(state("epochCount")));
  expect(c.clamp.topDefault).toBe(state("clampTop") === "true");
  expect(c.clamp.bottomDefault).toBe(state("clampBottom") === "true");
});

test("labels come from main's content.ts (walk label included)", () => {
  expect(c.walk.label).toBe(inputLabels.walk);
  expect(c.volatility.label).toBe(inputLabels.vol);
  expect(c.epochs.label).toBe(inputLabels.epoch);
  expect(c.samples.label).toBe(inputLabels.samples);
});

/** Form m7: our own Postel-liberal number parser in front of main's parse. */
test("commas, spaces, NBSP, narrow NBSP, thin space and U+2212 normalise before parsing", () => {
  expect(normalizeNumberText("1,000")).toBe("1000");
  expect(normalizeNumberText("2 000")).toBe("2000");
  expect(normalizeNumberText("2\u00A0000")).toBe("2000");
  expect(normalizeNumberText("2\u202F000")).toBe("2000");
  expect(normalizeNumberText("2\u2009000")).toBe("2000");
  expect(normalizeNumberText("\u22120.4")).toBe("-0.4");
  expect(parseNumber("1,000", "int")).toBe(1000);
  expect(parseNumber(" 0.25 ", "float")).toBe(0.25);
});

test("int mode keeps main's canonical-integer rule", () => {
  expect(parseCanonicalIntegerV2("10")).toBe(10);
  expect(Number.isNaN(parseCanonicalIntegerV2("010"))).toBe(true);
  expect(Number.isNaN(parseCanonicalIntegerV2("1e3"))).toBe(true);
  expect(Number.isNaN(parseCanonicalIntegerV2("1.5"))).toBe(true);
  expect(Number.isNaN(parseNumber("NaN", "int"))).toBe(true);
  expect(parseNumber("10,000", "int")).toBe(10_000);
});
