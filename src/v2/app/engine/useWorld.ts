import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import { WEEKS_PER_EPOCH } from "../../../constants";
import { useEngineSelector, useEngineSet } from "../../../hooks/use-engine";
import type { ModelsValues } from "../models/values";
import { priceBands, type PriceBands } from "../world/bands";
import { type History, historyOf } from "../world/history";
import { recomputeWatch } from "../shell/press";
import { engineConfig, inputsReady } from "./config";
import { type InputsPhase, useWorldInputs } from "./inputs";

export type World = {
  bands: PriceBands | null;
  /** §2A: the traded weekly price while "Show historic price" is on, else null. */
  history: History | null;
  now: number;
  /** Weeks on the time axis: the engine's horizon, or epochs × 4 years before it returns. */
  horizon: number;
  /** §1h Chart · no data: where the price fetch stands ("ready" once bands are drawn). */
  phase: InputsPhase;
  retry: () => void;
  /** §1O: a recompute has run past 400ms (progress on the plot). */
  busy: boolean;
};

/** §1O: progress shows once a recompute has run this long. */
const BUSY_MS = 400;

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
export const useWorld = (values: ModelsValues, now: number, historic = false): World => {
  const set = useEngineSet();
  const { inputs, phase, retry } = useWorldInputs(now);
  const datasets = useEngineSelector(selectDatasets);
  const [busy, setBusy] = useState(false);
  const watch = useMemo(() => recomputeWatch(BUSY_MS, setBusy), []);

  useLayoutEffect(() => {
    // Hold every submit (in practice the first) until price and block height are real.
    if (!inputsReady(inputs)) return;
    const config = engineConfig(values, inputs, historic);
    if (config === null) return;
    watch.start();
    set(config);
  }, [values, inputs, historic, set, watch]);

  useEffect(() => {
    watch.done();
  }, [datasets, watch]);

  const bands = useMemo(() => (isSeriesList(datasets) ? priceBands(datasets) : null), [datasets]);
  const history = useMemo(
    () => (historic && isSeriesList(datasets) ? historyOf(datasets, now) : null),
    [historic, datasets, now],
  );
  return {
    bands,
    history,
    now,
    horizon: bands?.weeks ?? values.epochCount * WEEKS_PER_EPOCH,
    phase: bands === null ? phase : "ready",
    retry,
    busy,
  };
};
