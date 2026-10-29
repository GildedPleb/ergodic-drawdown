/**
 * G12 (a): main's model code, dumped read-only and generically. Every own field of every model in
 * `models` (in order), the walk names, and the ModelProvider's starting values (a server render of
 * main's own provider). Nothing here names a model field, so a field main adds, drops or renames
 * shows up in the dump. Functions dump as "[function]"; a non-finite number as its name.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ModelProvider, useModel } from "../../../src/contexts/model";
import { models } from "../../../src/data/models";
import { walks } from "../../../src/data/walks";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export const plain = (value: unknown): Json => {
  if (typeof value === "function") return "[function]";
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (value === undefined) return "[undefined]";
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .toSorted()
        .map((key) => [key, plain(Object.getOwnPropertyDescriptor(value, key)?.value)]),
    );
  }
  return typeof value === "bigint" || typeof value === "symbol" ? value.toString() : "[unknown]";
};

/** The provider's values on first render, setters left out. */
const contextDefaults = (): Json => {
  let seen: Json = null;
  const Probe = (): null => {
    const value = useModel();
    seen = plain(
      Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v !== "function")),
    );
    return null;
  };
  renderToStaticMarkup(createElement(ModelProvider, null, createElement(Probe)));
  return seen;
};

export const dumpMainModels = (): Json => ({
  defaults: contextDefaults(),
  models: models.map(plain),
  walks: Object.keys(walks),
});
