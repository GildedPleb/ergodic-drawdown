import { type ModelParam, type PriceModel, type PriceWeek } from "../../types";

type SettingsOf<P extends readonly ModelParam[]> = {
  [Item in P[number] as Item["key"]]: Item extends { kind: "number" } ? number : string;
};

interface PricedWeek<Settings> {
  currentBlock: number;
  currentPrice: number;
  now: number;
  settings: Settings;
  week: number;
}

interface ModelDefinition<P extends readonly ModelParam[], T extends string> {
  description: string;
  maxPrice: (week: PricedWeek<SettingsOf<P>>) => number;
  minPrice: (week: PricedWeek<SettingsOf<P>>) => number;
  name: T;
  params: P;
  summary: string;
}

// A generic predicate cannot narrow `SettingsOf<P>` inside this function. The object was built from `params`.
const priced = <P extends readonly ModelParam[]>(week: PriceWeek): PricedWeek<SettingsOf<P>> =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- params built this object; the generic cannot prove it
  week as PricedWeek<SettingsOf<P>>;

/** Gives the price functions the settings type derived from `params`. */
export const defineModel = <const P extends readonly ModelParam[], const T extends string>(
  model: ModelDefinition<P, T>,
): PriceModel<T> => ({
  description: model.description,
  maxPrice: (week) => model.maxPrice(priced<P>(week)),
  minPrice: (week) => model.minPrice(priced<P>(week)),
  name: model.name,
  params: model.params,
  summary: model.summary,
});
