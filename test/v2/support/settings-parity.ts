/**
 * G12 (b) and (c): the Models pane against main's settings.
 *
 * (b) `settingDiffs`: every setting the golden (main-models.ts) declares has a control in the
 * rendered ModelsSheet tagged `data-setting="<model>.<key>"`, with the same min, max, step,
 * options and default, for every model picked the way v2 picks it (choosePatch). NOT_SHOWN is the
 * one way out.
 *
 * (c) `scenarioDiffs`: for each model, v2's engineConfig().scenario carries the values main's code
 * declares for that model, computed by importing main read-only.
 *
 * Reading main's settings: a model with `params` declares one setting per param (`key`, `min`,
 * `max`, `step`, `options`, `default`). A model without them is main's older shape, where
 * components/input/model.tsx `handleModel` shows `variable` (rangeMin…rangeMax, default `default`)
 * when `varInput` is set and `minMaxMultiple` when `varRange` is true, defaulting from the provider.
 * Every other provider value is one global setting (`model` lists the models, `walk` the walks).
 * A model field outside both shapes (READ_FIELDS) is a setting too, so a new knob needs a control.
 */
import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import * as mainModels from "../../../src/data/models";
import { engineConfig } from "../../../src/v2/app/engine/config";
import { ModelsSheet } from "../../../src/v2/app/models/ModelsSheet";
import { choosePatch, defaultModelsValues } from "../../../src/v2/app/models/values";
import { dumpMainModels, plain, type Json } from "./main-models";

/**
 * Provider values the pane has no control for. Each entry cites the Form ruling that hides it
 * ("G12 exemptions", docs/design/v32-ref/V32-BUILD.md:857).
 */
export const NOT_SHOWN: Readonly<Record<string, { ruling: string }>> = {
  loadingPriceData: {
    ruling: "V32-BUILD:857 G12 exemptions: a state flag, not a setting, so no control.",
  },
  pinnedWeeks: {
    ruling:
      "V32-BUILD:857 G12 exemptions: chart interaction state, out of the pane's scope (v2 sends null).",
  },
  showModel: {
    ruling:
      "V32-BUILD:857 G12 exemptions: main's model-only chart mode; the v2 pane has no toggle (v2 sends false). Whether v2 offers it is the PO's call.",
  },
};

/** Provider values main's older shape keeps per model (handleModel), not as global settings. */
const LEGACY_MODEL_KEYS = ["variable", "minMaxMultiple"];

/** main's src/engine-bridge.tsx: the provider values it copies into the engine scenario as-is. */
const SCENARIO_FROM_PROVIDER = ["clampBottom", "clampTop", "showModel", "volatility", "walk"];

/** Plans (Slice 2) fills these; they are not Models settings. */
const NOT_MODELS = new Set(["oneOffFiatVariables", "oneOffItems", "reoccurringItems"]);

/** Model fields the two shapes above already read (or that are not settings: names, copy, prices). */
const READ_FIELDS = new Set([
  "default",
  "description",
  "maxPrice",
  "minPrice",
  "modelType",
  "name",
  "params",
  "rangeMax",
  "rangeMin",
  "summary",
  "varInput",
  "varRange",
]);

type Setting = { key: string; spec: Record<string, Json> };

const get = (o: unknown, key: string): unknown =>
  typeof o === "object" && o !== null ? Object.getOwnPropertyDescriptor(o, key)?.value : undefined;

const list = (o: unknown): unknown[] => (Array.isArray(o) ? o : []);

const nameOf = (model: unknown): string => String(get(model, "name") ?? get(model, "modelType"));

/** Only the attributes main declares. */
const spec = (fields: Record<string, unknown>): Record<string, Json> =>
  Object.fromEntries(
    Object.entries(fields)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, plain(v)]),
  );

const shapeSettings = (model: unknown, defaults: unknown): Setting[] => {
  const params = get(model, "params");
  if (Array.isArray(params)) {
    return params.map((p: unknown) => ({
      key: String(get(p, "key")),
      spec: spec({
        default: get(p, "default"),
        max: get(p, "max"),
        min: get(p, "min"),
        options:
          get(p, "options") === undefined
            ? undefined
            : list(get(p, "options")).map((o) => get(o, "value") ?? o),
        step: get(p, "step"),
      }),
    }));
  }
  return [
    ...(get(model, "varInput") === ""
      ? []
      : [
          {
            key: "variable",
            spec: spec({
              default: get(model, "default"),
              max: get(model, "rangeMax"),
              min: get(model, "rangeMin"),
            }),
          },
        ]),
    ...(get(model, "varRange") === true
      ? [{ key: "minMaxMultiple", spec: spec({ default: get(defaults, "minMaxMultiple") }) }]
      : []),
  ];
};

const modelSettings = (model: unknown, defaults: unknown): Setting[] => [
  ...shapeSettings(model, defaults),
  ...Object.keys(typeof model === "object" && model !== null ? model : {})
    .filter((key) => !READ_FIELDS.has(key))
    .map((key) => ({ key, spec: spec({ default: get(model, key) }) })),
];

/** Provider values that are global settings: not per-model, not an object of per-model settings. */
const globalSettings = (golden: unknown, model: string): Setting[] => {
  const defaults = get(golden, "defaults");
  const names = list(get(golden, "models")).map(nameOf);
  return Object.keys(typeof defaults === "object" && defaults !== null ? defaults : {})
    .filter((key) => !LEGACY_MODEL_KEYS.includes(key) && !(key in NOT_SHOWN))
    .filter((key) => {
      const v = get(defaults, key);
      return typeof v !== "object" || v === null || Array.isArray(v);
    })
    .map((key) => ({
      key,
      spec:
        key === "model"
          ? spec({ default: model, options: names })
          : key === "walk"
            ? spec({ default: get(defaults, key), options: get(golden, "walks") })
            : spec({ default: get(defaults, key) }),
    }));
};

const settingOf = (props: unknown): Record<string, Json> => {
  const bounds = get(props, "bounds");
  return spec({
    default: get(props, "value") ?? get(props, "checked"),
    max: get(bounds, "max"),
    min: get(bounds, "min"),
    options: get(props, "options"),
    step: get(props, "step"),
  });
};

const collect = (node: unknown, out: Map<string, Record<string, Json>>): void => {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, out);
    return;
  }
  if (!isValidElement(node)) return;
  const props: unknown = node.props;
  const name = get(props, "data-setting");
  if (typeof name === "string") out.set(name, settingOf(props));
  for (const value of Object.values(typeof props === "object" && props !== null ? props : {})) {
    collect(value, out);
  }
};

/** The sheet's tagged controls, read from its element tree inside a server render. */
const sheetControls = (model: string): Map<string, Record<string, Json>> => {
  let tree: unknown = null;
  const Probe = (): null => {
    tree = ModelsSheet({
      values: { ...defaultModelsValues(), ...choosePatch(model) },
      onChange: () => undefined,
    });
    return null;
  };
  renderToStaticMarkup(createElement(Probe));
  const out = new Map<string, Record<string, Json>>();
  collect(tree, out);
  return out;
};

const show = (v: unknown): string => JSON.stringify(v);

export const settingDiffs = (golden: unknown): string[] =>
  list(get(golden, "models")).flatMap((model) => {
    const name = nameOf(model);
    const controls = sheetControls(name);
    const wanted = [
      ...globalSettings(golden, name),
      ...modelSettings(model, get(golden, "defaults")),
    ];
    const missing = wanted.flatMap(({ key, spec: want }) => {
      const tag = `${name}.${key}`;
      const got = controls.get(tag);
      if (got === undefined) return [`${tag}: main declares it; no control data-setting="${tag}"`];
      return Object.keys(want)
        .filter((attr) => show(want[attr]) !== show(got[attr]))
        .map((attr) => `${tag} ${attr}: main ${show(want[attr])}, v2 ${show(got[attr])}`);
    });
    const extra = [...controls.keys()]
      .filter((tag) => !wanted.some(({ key }) => tag === `${name}.${key}`))
      .map((tag) => `${tag}: v2 control with no main setting`);
    return [...missing, ...extra];
  });

/** main's declaredSettings when it has one (the params shape); undefined on the older shape. */
const declared: unknown = Object.getOwnPropertyDescriptor(mainModels, "declaredSettings")?.value;

const WORLD = { currentBlock: 1, currentPrice: 1, halvings: {}, interim: [], now: 0 };

export const scenarioDiffs = (): string[] => {
  const main = dumpMainModels();
  const defaults = get(main, "defaults");
  return list(get(main, "models")).flatMap((model) => {
    const name = nameOf(model);
    const legacy = modelSettings(model, defaults);
    const want: Record<string, Json> = {
      ...Object.fromEntries(SCENARIO_FROM_PROVIDER.map((k) => [k, plain(get(defaults, k))])),
      model: name,
      ...(typeof declared === "function"
        ? { settings: plain(declared(name)) }
        : {
            minMaxMultiple: plain(get(defaults, "minMaxMultiple")),
            variable: plain(
              legacy.find((s) => s.key === "variable")?.spec["default"] ??
                get(defaults, "variable"),
            ),
          }),
    };
    const scenario = engineConfig(
      { ...defaultModelsValues(), ...choosePatch(name) },
      WORLD,
    )?.scenario;
    if (scenario === undefined) return [`${name}: v2 engineConfig returned null`];
    const got = Object.fromEntries(
      Object.entries(scenario)
        .filter(([k]) => !NOT_MODELS.has(k))
        .map(([k, v]) => [k, plain(v)]),
    );
    return [...new Set([...Object.keys(want), ...Object.keys(got)])]
      .toSorted()
      .filter((k) => show(want[k]) !== show(got[k]))
      .map((k) => `${name} scenario.${k}: main ${show(want[k])}, v2 ${show(got[k])}`);
  });
};
