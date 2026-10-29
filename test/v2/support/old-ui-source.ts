/**
 * Probe M1 / Form B3: G12 must see drift in main. The values the Models pane copies from main's
 * old-UI components (attributes, useSettledNumber calls, steps, floors, constants and content
 * labels) are re-read here from main's SOURCE TEXT and compared with the v2 schema. Models, walks
 * and ModelProvider defaults are main's own code, dumped by main-models.ts and checked by
 * g12-models.test.ts. `oldUiDiffs` is pure over a `read` function, so tests can feed it mutated sources and
 * prove that a change in main turns G12 red.
 */
import type { ModelsPaneSnapshot } from "../../../src/v2/app/models/from-old-ui";

export type Read = (path: string) => Promise<string>;

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
    // main's years label is a function of its live cap: `Years (1-${max}):`.
    const yearsLabel = one(
      inputBlock,
      /\byears: \(max: number\): string => `([^`]*)`/,
      "content.ts years",
    )[1];
    eq("years label", c.years.label, yearsLabel?.replace("${max}", String(c.years.max)));
    eq("samples label", c.samples.label, label(inputBlock, "samples"));
    eq("clamp label", c.clamp.label, label(inputBlock, "clamp"));
    eq("clamp top label", c.clamp.topLabel, label(inputBlock, "clampTop"));
    eq("clamp bottom label", c.clamp.bottomLabel, label(inputBlock, "clampBottom"));

    // useSettledNumber fields
    const settled = async (file: string, control: (typeof c)["volatility" | "samples"]) => {
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
    // years.tsx: accept 1…cap, where cap = maxYears(weeksSinceLastHalving(halvings)) (horizon.ts).
    const years = await read("components/input/years.tsx");
    const yAcc = one(years, /accept: \(next\) => next >= ([\w.]+) && next <= (\w+)/, "years.tsx");
    eq("years.tsx accept min", c.years.accept.min, n(yAcc[1]));
    eq("years.tsx accept max is the live cap", yAcc[2], "cap");
    one(years, /const cap = maxYears\(weeksSinceLastHalving\(halvings\)\);/, "years.tsx cap");
    eq(
      "years.tsx parse",
      c.years.parse,
      /parse: parseCanonicalInteger/.test(years) ? "int" : "float",
    );
    eq("years.tsx emptyValue", c.years.emptyValue, /emptyValue:/.test(years) ? "set" : null);
    eq("years.tsx min", c.years.min, n(one(years, /\bmin="([\d.]+)"/, "years.tsx min")[1]));
    one(years, /\bmax=\{cap\}/, "years.tsx max");
    const horizon = await read("horizon.ts");
    one(
      horizon,
      /export const MAX_YEAR_COUNT = \(MAX_EPOCH_COUNT \* WEEKS_PER_EPOCH\) \/ WEEKS_PER_YEAR;/,
      "horizon.ts MAX_YEAR_COUNT",
    );
    one(
      constantsText,
      /export const WEEKS_PER_EPOCH = 4 \* WEEKS_PER_YEAR;/,
      "constants WEEKS_PER_EPOCH",
    );
    eq("years max (MAX_YEAR_COUNT)", c.years.max, (constants["MAX_EPOCH_COUNT"] ?? 0) * 4);
    eq("years accept max", c.years.accept.max, c.years.max);
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
  } catch (error) {
    if (error instanceof Missing) diffs.push(error.message);
    else throw error;
  }
  return diffs;
};
