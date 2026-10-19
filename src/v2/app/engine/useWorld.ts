import { useLayoutEffect, useMemo } from "react";

import { WEEKS_PER_EPOCH } from "../../../constants";
import { useEngineSelector, useEngineSet } from "../../../hooks/use-engine";
import type { ModelsValues } from "../models/values";
import { priceBands, type PriceBands } from "../world/bands";
import { engineConfig } from "./config";
import { useWorldInputs } from "./inputs";

export type World = {
  bands: PriceBands | null;
  now: number;
  /** Weeks on the time axis: the engine's horizon, or epochs × 4 years before it returns. */
  horizon: number;
};

const selectDatasets = (s: { dataProperties: { datasets: unknown } | null }): unknown =>
  s.dataProperties?.datasets;

const isSeriesList = (
  v: unknown,
): v is ReadonlyArray<{ label?: string | undefined; data: readonly unknown[] }> =>
  Array.isArray(v) &&
  v.every(
    (d: unknown) => typeof d === "object" && d !== null && "data" in d && Array.isArray(d.data),
  );

/** Sets the engine from the Models values and reads the price bands back. */
export const useWorld = (values: ModelsValues, now: number): World => {
  const set = useEngineSet();
  const inputs = useWorldInputs(now);
  const datasets = useEngineSelector(selectDatasets);

  useLayoutEffect(() => {
    const config = engineConfig(values, inputs);
    if (config !== null) set(config);
  }, [values, inputs, set]);

  const bands = useMemo(() => (isSeriesList(datasets) ? priceBands(datasets) : null), [datasets]);
  return { bands, now, horizon: bands?.weeks ?? values.epochCount * WEEKS_PER_EPOCH };
};
