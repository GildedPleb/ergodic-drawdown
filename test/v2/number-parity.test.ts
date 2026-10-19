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
import { modelsPaneSchema } from "../../src/v2/app/models";
import {
  createSettledNumber,
  type NumberRule,
  normalizeNumberText,
  parseCanonicalInteger as parseCanonicalIntegerV2,
  parseNumber,
} from "../../src/v2/design/primitives/NumberField/settle";
import { oldUiDiffs, type Read } from "./support/old-ui-source";

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
 * Probe M1: main's source literals vs the G12 schema, then seeded mutations of main's source that
 * must each turn the comparison red (the gate can see drift; it is not circular).
 */
const read: Read = (p) => file(`${import.meta.dir}/../../src/${p}`).text();

test("G12: every copied value matches main's source (components, contexts, constants, content, models)", async () => {
  expect(await oldUiDiffs(read, modelsPaneSchema)).toEqual([]);
});

const MUTATIONS: readonly { name: string; path: string; from: string | RegExp; to: string }[] = [
  {
    name: "Bubble volatility step",
    path: "components/input/volatility.tsx",
    from: /\? 0\.005 :/,
    to: "? 0.01 :",
  },
  {
    name: "volatility max attr",
    path: "components/input/volatility.tsx",
    from: 'max="1"',
    to: 'max="2"',
  },
  {
    name: "volatility accept",
    path: "components/input/volatility.tsx",
    from: "next <= 1,",
    to: "next <= 2,",
  },
  { name: "+/- step", path: "components/input/model.tsx", from: 'step=".1"', to: 'step=".5"' },
  { name: "+/- min", path: "components/input/model.tsx", from: 'min="1.01"', to: 'min="1.5"' },
  {
    name: "+/- floor",
    path: "components/input/model.tsx",
    from: "value < 1.01",
    to: "value < 1.5",
  },
  { name: "variable step", path: "components/input/model.tsx", from: 'step="1"', to: 'step="2"' },
  {
    name: "variable range filter removed",
    path: "components/input/model.tsx",
    from: "value <= modelMap[model].rangeMax && ",
    to: "",
  },
  {
    name: "default volatility",
    path: "contexts/model.tsx",
    from: "useState<number>(0.1)",
    to: "useState<number>(0.2)",
  },
  {
    name: "default walk",
    path: "contexts/model.tsx",
    from: 'useState<WalkTypes>("Bubble")',
    to: 'useState<WalkTypes>("Random")',
  },
  {
    name: "default clamp top",
    path: "contexts/model.tsx",
    from: "[clampTop, setClampTop] = useState<boolean>(false)",
    to: "[clampTop, setClampTop] = useState<boolean>(true)",
  },
  {
    name: "default samples constant",
    path: "constants.ts",
    from: "DEFAULT_SIMULATION_COUNT = 1000",
    to: "DEFAULT_SIMULATION_COUNT = 2000",
  },
  {
    name: "samples emptyValue",
    path: "components/input/samples.tsx",
    from: "emptyValue: 1000",
    to: "emptyValue: 500",
  },
  {
    name: "samples min attr",
    path: "components/input/samples.tsx",
    from: 'min="1"',
    to: 'min="0"',
  },
  {
    name: "epoch accept",
    path: "components/input/epoch.tsx",
    from: "next <= 100",
    to: "next <= 30",
  },
  { name: "walk label", path: "content.ts", from: 'walk: "Walk Strategy:"', to: 'walk: "Walk:"' },
  { name: "model title", path: "content.ts", from: 'model: "Model",', to: 'model: "Models",' },
  {
    name: "Historic rangeMax",
    path: "data/models/historic.ts",
    from: "rangeMax: 3,",
    to: "rangeMax: 4,",
  },
  {
    name: "Historic rangeMin",
    path: "data/models/historic.ts",
    from: "rangeMin: 2,",
    to: "rangeMin: 1,",
  },
  {
    name: "Historic default",
    path: "data/models/historic.ts",
    from: "default: 2,",
    to: "default: 3,",
  },
  {
    name: "Historic label",
    path: "data/models/historic.ts",
    from: '"Previous Halvings"',
    to: '"Halvings"',
  },
  { name: "CAGR rangeMin", path: "data/models/cagr.ts", from: "rangeMin: 0,", to: "rangeMin: 1," },
  {
    name: "CAGR rangeMax",
    path: "data/models/cagr.ts",
    from: "rangeMax: Infinity,",
    to: "rangeMax: 100,",
  },
  { name: "CAGR default", path: "data/models/cagr.ts", from: "default: 50,", to: "default: 40," },
];

test("G12 seeded mutations: each change to main's source turns the comparison red", async () => {
  const green: string[] = [];
  for (const m of MUTATIONS) {
    const original = await read(m.path);
    const mutated = original.replace(m.from, m.to);
    expect({ seed: m.name, applied: mutated !== original }).toEqual({
      seed: m.name,
      applied: true,
    });
    const diffs = await oldUiDiffs(
      (p) => (p === m.path ? Promise.resolve(mutated) : read(p)),
      modelsPaneSchema,
    );
    if (diffs.length === 0) green.push(m.name);
  }
  expect(green).toEqual([]);
});

/**
 * Form ruling 1: the variable field ignores keystrokes outside the selected model's
 * rangeMin…rangeMax (main's handleVariable condition, read from main's source and evaluated here),
 * for Historic ("Previous Halvings", 2–3) and CAGR ("R (%)", 0–∞).
 */
const mainVariableAccept = async (): Promise<
  (value: number, min: number, max: number) => boolean
> => {
  const text = await read("components/input/model.tsx");
  // main: `if (value <= modelMap[model].rangeMax && value >= modelMap[model].rangeMin)`.
  const m =
    /if \(value (<=?) modelMap\[model\]\.rangeMax && value (>=?) modelMap\[model\]\.rangeMin\)/.exec(
      text,
    );
  if (m === null) throw new Error("main's handleVariable condition moved");
  const inclusiveMax = m[1] === "<=";
  const inclusiveMin = m[2] === ">=";
  return (v, min, max) =>
    (inclusiveMax ? v <= max : v < max) && (inclusiveMin ? v >= min : v > min);
};

const variableRun = (min: number, max: number, initial: number, steps: readonly string[]) => {
  let value = initial;
  const commits: number[] = [];
  const field = createSettledNumber(initial, {
    rule: { kind: "live", apply: (x) => (x <= max && x >= min ? x : undefined) },
    parse: "float",
    commit: (x) => {
      commits.push(x);
      value = x;
    },
    getValue: () => value,
  });
  const drafts = steps.map((s) => {
    if (s === "<blur>") field.blur();
    else field.change(s);
    return field.draft();
  });
  return { commits, drafts, value };
};

for (const name of ["Historic", "CAGR"] as const) {
  test(`${name} variable field: v2 accepts exactly what main's range condition accepts`, async () => {
    const accept = await mainVariableAccept();
    const row = modelsPaneSchema.models.find((m) => m.name === name);
    if (row === undefined) throw new Error(`${name} missing`);
    const min = row.rangeMin === "Infinity" ? Infinity : row.rangeMin;
    const max = row.rangeMax === "Infinity" ? Infinity : row.rangeMax;
    const seq = ["1", "2", "3", "4", "", "-1", "2.5", "NaN", "50", "1e3", "<blur>"];
    const v2 = variableRun(min, max, row.default, seq);
    // main: controlled input, value={variable}; a rejected keystroke leaves the committed value.
    let value = row.default;
    const commits: number[] = [];
    const drafts = seq.map((s) => {
      if (s !== "<blur>") {
        const parsed = Number.parseFloat(s);
        if (accept(parsed, min, max)) {
          value = parsed;
          commits.push(parsed);
        }
      }
      return Number.isNaN(value) ? "" : String(value);
    });
    expect({ commits: v2.commits, drafts: v2.drafts }).toEqual({ commits, drafts });
  });
}

test("Historic keeps Previous Halvings inside 2–3; CAGR accepts any R ≥ 0", () => {
  const h = variableRun(2, 3, 2, ["4", "1", "3", "<blur>"]);
  expect(h.commits).toEqual([3]);
  expect(h.value).toBe(3);
  const cagr = variableRun(0, Infinity, 50, ["-5", "120", "<blur>"]);
  expect(cagr.commits).toEqual([120]);
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

/**
 * Form N1: the variable rule follows the CURRENT model, also when the field stays mounted (the
 * controller reads options.rule at call time). Historic → CAGR → Historic; each model's own range,
 * not main's first-model stale closure.
 */
const modelRule = (name: string): NumberRule => {
  const row = modelsPaneSchema.models.find((m) => m.name === name);
  if (row === undefined) throw new Error(name);
  const lo = row.rangeMin === "Infinity" ? Infinity : row.rangeMin;
  const hi = row.rangeMax === "Infinity" ? Infinity : row.rangeMax;
  return { kind: "live" as const, apply: (x: number) => (x <= hi && x >= lo ? x : undefined) };
};
test("variable range follows the current model across Historic → CAGR → Historic", () => {
  let value = 2;
  const commits: number[] = [];
  const options = {
    rule: modelRule("Historic"),
    parse: "float" as const,
    commit: (x: number) => {
      commits.push(x);
      value = x;
    },
    getValue: () => value,
  };
  const field = createSettledNumber(2, options);
  field.change("5");
  field.change("9");
  expect(commits).toEqual([]);
  options.rule = modelRule("CAGR"); // switch while mounted
  field.change("75");
  field.change("0");
  expect(commits).toEqual([75, 0]);
  options.rule = modelRule("Historic");
  field.change("5");
  field.change("9");
  field.change("3");
  expect(commits).toEqual([75, 0, 3]);
});
