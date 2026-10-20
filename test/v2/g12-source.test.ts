/**
 * G12: every value v2 copies from the old UI (constants, labels, field limits, defaults, model
 * definitions) is re-read from main's source text, and seeded edits to that source must turn the
 * comparison red. modelsPaneSchema itself deep-equals old-ui-models.snapshot.json.
 */
import { file } from "bun";
import { expect, test } from "bun:test";

import { modelsPaneSchema } from "../../src/v2/app/models/schema";
import { oldUiDiffs, type Read } from "./support/old-ui-source";

// Memoised: the seeded mutations re-run oldUiDiffs over the same files many times.
const sources = new Map<string, Promise<string>>();
const read: Read = (p) => {
  const hit = sources.get(p);
  if (hit !== undefined) return hit;
  const text = file(`${import.meta.dir}/../../src/${p}`).text();
  sources.set(p, text);
  return text;
};

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
    from: "rangeMax: 1000,",
    to: "rangeMax: 100,",
  },
  { name: "CAGR default", path: "data/models/cagr.ts", from: "default: 20,", to: "default: 40," },
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

const snapshotPath = `${import.meta.dir}/old-ui-models.snapshot.json`;

test("G12: modelsPaneSchema deep-equals the committed old-UI snapshot", async () => {
  expect(modelsPaneSchema).toEqual(JSON.parse(await file(snapshotPath).text()) as unknown);
});
