/**
 * §1V: the Models settings survive a reload. The front end had no settings store (main keeps
 * these in React state only), so this is the one place they're kept: one localStorage key,
 * read back only when every value has the right type and names a real model and walk.
 */
import { strings } from "../strings";
import { modelsPaneSchema } from "./schema";
import { defaultModelsValues, type ModelsValues } from "./values";

export const STORE_KEY = "stackmath.v2.models";

type Storage = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };

/** The page's localStorage; none during server rendering (tests). */
export const pageStore = (): Storage | undefined =>
  typeof localStorage === "undefined" ? undefined : localStorage;

const valid = (raw: unknown, base: ModelsValues): raw is ModelsValues => {
  if (typeof raw !== "object" || raw === null) return false;
  for (const [k, v] of Object.entries(base)) {
    if (typeof Reflect.get(raw, k) !== typeof v) return false;
  }
  const model: unknown = Reflect.get(raw, "model");
  const walk: unknown = Reflect.get(raw, "walk");
  return (
    typeof model === "string" &&
    typeof walk === "string" &&
    modelsPaneSchema.modelOrder.includes(model) &&
    modelsPaneSchema.walks.includes(walk)
  );
};

/** The kept settings, or the defaults when there are none (or they don't read back). */
export const loadValues = (store: Storage | undefined): ModelsValues => {
  const base = defaultModelsValues();
  try {
    const raw: unknown = JSON.parse(store?.getItem(STORE_KEY) ?? "null");
    if (!valid(raw, base)) return base;
    const out = { ...base };
    for (const k of Object.keys(base)) Reflect.set(out, k, Reflect.get(raw, k));
    return out;
  } catch {
    return base;
  }
};

export const saveValues = (store: Storage | undefined, values: ModelsValues): void => {
  try {
    store?.setItem(STORE_KEY, JSON.stringify(values));
  } catch {
    // Private mode or a full store: the settings still apply, they just aren't kept.
  }
};

/**
 * Form §1MP ruling 3: the pane's view settings survive a reload too: "Show historic price", the
 * Bitcoin colour and each asset's on/off square (only Bitcoin's can change; S&P and Inflation are
 * inert). They are not back-end settings, so they keep their own key beside the Models values.
 */
export const VIEW_KEY = "stackmath.v2.view";

export type ViewValues = { bitcoin: boolean; historic: boolean; colour: string };

export const defaultView = (): ViewValues => ({
  bitcoin: true,
  historic: false,
  colour: strings.models.colours[0].name,
});

/** The kept view, field by field: a field that doesn't read back keeps its default. */
export const loadView = (store: Storage | undefined): ViewValues => {
  const out = defaultView();
  try {
    const raw: unknown = JSON.parse(store?.getItem(VIEW_KEY) ?? "null");
    if (typeof raw !== "object" || raw === null) return out;
    const bitcoin: unknown = Reflect.get(raw, "bitcoin");
    const historic: unknown = Reflect.get(raw, "historic");
    const colour: unknown = Reflect.get(raw, "colour");
    if (typeof bitcoin === "boolean") out.bitcoin = bitcoin;
    if (typeof historic === "boolean") out.historic = historic;
    if (strings.models.colours.some((c) => c.name === colour) && typeof colour === "string") {
      out.colour = colour;
    }
    return out;
  } catch {
    return out;
  }
};

export const saveView = (store: Storage | undefined, view: ViewValues): void => {
  try {
    store?.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    // As saveValues: still applied, just not kept.
  }
};
