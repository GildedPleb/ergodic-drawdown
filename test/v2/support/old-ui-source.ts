/**
 * Probe M1 / Form B3: G12 must see drift in main. Every value the Models pane copies from main is
 * re-read here from main's SOURCE TEXT (component attributes, useSettledNumber calls, ModelProvider
 * useState defaults, constants, content labels and every model definition) and compared with the
 * v2 schema. `oldUiDiffs` is pure over a `read` function, so tests can feed it mutated sources and
 * prove that a change in main turns G12 red.
 */
import type { ModelsPaneSnapshot } from "../../../src/v2/app/models/from-old-ui";

export type Read = (path: string) => Promise<string>;

const MODEL_FILES = [
  "cagr.ts",
  "historic.ts",
  "power-law.ts",
  "power-law-support.ts",
  "rainbow.ts",
  "stock-to-flow.ts",
  "stock-to-flow-2024-refit.ts",
] as const;

class Missing extends Error {}

const one = (text: string, re: RegExp, where: string): RegExpExecArray => {
  const m = re.exec(text);
  if (m === null) throw new Missing(`${where}: no longer matches ${re}`);
  return m;
};

const literal = (token: string, constants: Record<string, number>): number | "Infinity" => {
  const t = token.trim();
  if (t === "Infinity") return "Infinity";
  if (t in constants) return constants[t] ?? Number.NaN;
  return Number(t.replaceAll("_", "").replace(/^"(.*)"$/, "$1"));
};

export const oldUiDiffs = async (read: Read, schema: ModelsPaneSnapshot): Promise<string[]> => {
  const diffs: string[] = [];
  const eq = (what: string, got: unknown, want: unknown): void => {
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      diffs.push(`${what}: main ${JSON.stringify(want)} ≠ v2 ${JSON.stringify(got)}`);
    }
  };
  try {
    const constantsText = await read("constants.ts");
    const constants: Record<string, number> = {};
    for (const m of constantsText.matchAll(/export const (\w+) = ([\d_.]+);/g)) {
      constants[m[1] ?? ""] = Number((m[2] ?? "").replaceAll("_", ""));
    }
    const n = (token: string | undefined): number | "Infinity" => literal(token ?? "", constants);

    // content.ts labels
    const content = await read("content.ts");
    const inputBlock =
      one(content, /export const inputLabels = \{([\s\S]*?)\};/, "content.ts")[1] ?? "";
    const fieldBlock =
      one(content, /export const fieldLabels = \{([\s\S]*?)\};/, "content.ts")[1] ?? "";
    const label = (block: string, key: string): string =>
      one(block, new RegExp(`\\b${key}: "([^"]*)"`), `content.ts ${key}`)[1] ?? "";
    const c = schema.controls;
    eq("title (fieldLabels.model)", schema.title, label(fieldBlock, "model"));
    eq("walk label", c.walk.label, label(inputBlock, "walk"));
    eq("volatility label", c.volatility.label, label(inputBlock, "vol"));
    eq("epoch label", c.epochs.label, label(inputBlock, "epoch"));
    eq("samples label", c.samples.label, label(inputBlock, "samples"));
    eq("clamp label", c.clamp.label, label(inputBlock, "clamp"));
    eq("clamp top label", c.clamp.topLabel, label(inputBlock, "clampTop"));
    eq("clamp bottom label", c.clamp.bottomLabel, label(inputBlock, "clampBottom"));

    // useSettledNumber fields
    const settled = async (
      file: string,
      control: (typeof c)["volatility" | "samples" | "epochs"],
    ) => {
      const text = await read(`components/input/${file}`);
      const acc = one(text, /accept: \(next\) => next >= ([\w.]+) && next <= ([\w.]+)/, file);
      const parse = one(text, /parse: (Number\.parseFloat|parseCanonicalInteger)/, file)[1];
      const empty = /emptyValue: ([\w.]+)/.exec(text)?.[1];
      const attr = (name: string) =>
        n(
          one(text, new RegExp(`\\b${name}=(?:"([\\w.]+)"|\\{([\\w.]+)\\})`), `${file} ${name}`)
            .slice(1)
            .find(Boolean),
        );
      eq(`${file} accept`, control.accept, { min: n(acc[1]), max: n(acc[2]) });
      eq(`${file} parse`, control.parse, parse === "parseCanonicalInteger" ? "int" : "float");
      eq(`${file} emptyValue`, control.emptyValue, empty === undefined ? null : n(empty));
      eq(`${file} min`, control.min, attr("min"));
      eq(`${file} max`, control.max, attr("max"));
      return text;
    };
    const vol = await settled("volatility.tsx", c.volatility);
    await settled("samples.tsx", c.samples);
    await settled("epoch.tsx", c.epochs);
    const step = one(vol, /walk === "(\w+)" \? ([\d.]+) : ([\d.]+)/, "volatility.tsx step");
    eq("volatility step walk", "Bubble", step[1]);
    eq("volatility step (Bubble)", c.volatility.stepBubble, n(step[2]));
    eq("volatility step (other)", c.volatility.stepOther, n(step[3]));

    // model.tsx: variable range filter, +/- floor, steps
    const model = await read("components/input/model.tsx");
    one(
      model,
      /value <= modelMap\[model\]\.rangeMax && value >= modelMap\[model\]\.rangeMin/,
      "model.tsx range filter",
    );
    eq("variable rule", c.variable.rule, "live-range");
    const floor = one(
      model,
      /if \(value < ([\d.]+)\) setMinMaxMultiple\(([\d.]+)\)/,
      "model.tsx floor",
    );
    eq("+/- floor (test)", c.minMaxMultiple.floor, n(floor[1]));
    eq("+/- floor (value)", c.minMaxMultiple.floor, n(floor[2]));
    const inputAttr = (id: string, name: string) =>
      n(
        one(
          model,
          new RegExp(`id="${id}"[\\s\\S]*?${name}="([\\d.]+)"`),
          `model.tsx ${id} ${name}`,
        )[1],
      );
    eq("+/- min", c.minMaxMultiple.min, inputAttr("minMaxMultiple", "min"));
    eq("+/- step", c.minMaxMultiple.step, inputAttr("minMaxMultiple", "step"));
    eq("variable step", c.variable.step, inputAttr("modelVariable", "step"));

    // ModelProvider defaults
    const ctx = await read("contexts/model.tsx");
    const state = (name: string): string =>
      one(
        ctx,
        new RegExp(`\\[${name}, set\\w+\\] = useState<\\w+>\\(([^)]+)\\)`),
        `contexts ${name}`,
      )[1] ?? "";
    eq("default walk", schema.defaultWalk, JSON.parse(state("walk")));
    eq("default +/-", c.minMaxMultiple.default, n(state("minMaxMultiple")));
    eq("default volatility", c.volatility.default, n(state("volatility")));
    eq("default variable", c.variable.default, n(state("variable")));
    eq("default samples", c.samples.default, n(state("samples")));
    eq("default epochs", c.epochs.default, n(state("epochCount")));
    eq("default clamp top", c.clamp.topDefault, state("clampTop") === "true");
    eq("default clamp bottom", c.clamp.bottomDefault, state("clampBottom") === "true");

    // Every model definition: name, variable default, range, label (Form ruling 1).
    for (const fileName of MODEL_FILES) {
      const text = await read(`data/models/${fileName}`);
      const field = (key: string) =>
        one(text, new RegExp(`^\\s+${key}: ([^,\\n]+),`, "m"), `${fileName} ${key}`)[1] ?? "";
      const name = /"([^"]+)"/.exec(field("modelType"))?.[1] ?? "";
      const row = schema.models.find((m) => m.name === name);
      if (row === undefined) {
        diffs.push(`${fileName}: model "${name}" missing from v2`);
        continue;
      }
      eq(`${name} default`, row.default, n(field("default")));
      eq(`${name} rangeMin`, row.rangeMin, n(field("rangeMin")));
      eq(`${name} rangeMax`, row.rangeMax, n(field("rangeMax")));
      eq(`${name} varInput`, row.varInput, JSON.parse(field("varInput")));
      eq(`${name} varRange`, row.varRange, field("varRange") === "true");
    }
  } catch (error) {
    if (error instanceof Missing) diffs.push(error.message);
    else throw error;
  }
  return diffs;
};
