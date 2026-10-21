import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { weeksSinceLastHalving } from "../../../halvings";
import { maxYears, visibleWeeks } from "../../../horizon";
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
  /** Weeks on the time axis: the engine's horizon, or Years × 52 before it returns. */
  horizon: number;
  /** main's live Years cap: `maxYears(weeksSinceLastHalving(halvings))` (components/input/years.tsx). */
  yearsMax: number;
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
  // Form 2A-r3: the samples of the config last sent, paired with the datasets it brings back
  // (the coalescer runs the latest config last, so the settled pair is always right).
  const sent = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    // Hold every submit (in practice the first) until price and block height are real.
    if (!inputsReady(inputs)) return;
    const config = engineConfig(values, inputs, historic);
    if (config === null) return;
    watch.start();
    sent.current = config.samples;
    set(config);
  }, [values, inputs, historic, set, watch]);

  useEffect(() => {
    watch.done();
  }, [datasets, watch]);

  const bands = useMemo(() => {
    const read = isSeriesList(datasets) ? priceBands(datasets) : null;
    const n = sent.current;
    return read === null || n === undefined ? read : { ...read, n };
  }, [datasets]);
  const history = useMemo(
    () => (historic && isSeriesList(datasets) ? historyOf(datasets, now) : null),
    [historic, datasets, now],
  );
  return {
    bands,
    history,
    now,
    horizon: bands?.weeks ?? visibleWeeks(values.years),
    yearsMax: maxYears(weeksSinceLastHalving(inputs.halvings)),
    phase: bands === null ? phase : "ready",
    retry,
    busy,
  };
};
