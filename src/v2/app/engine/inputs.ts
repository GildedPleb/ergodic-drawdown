/**
 * Market inputs the engine needs (price, block height, halvings, interim weeks), fetched with
 * main's own api.ts / halvings.ts, the same steps as main's use-current-price, use-halvings and
 * use-interim hooks. Each lands when it arrives; until price and block are in, the engine reports
 * its "not zero" gate and the chart shows its empty state (§1h).
 */
import { useCallback, useEffect, useState } from "react";

import {
  fetchBlockByHeight,
  getCurrentBlockHeight,
  getCurrentPrice,
  getInterimWeeklyData,
} from "../../../api";
import { calculateHalvings, loadHalvings, saveHalvings } from "../../../halvings";
import type { HalvingData } from "../../../types";
import type { WorldInputs } from "./config";

/** The fetchers and the halvings cache (tests pass fakes). */
export type InputsIO = {
  price: (now: number) => Promise<{ close: number }>;
  height: (now: number) => Promise<number>;
  block: (height: number) => Promise<number>;
  interim: (now: number) => Promise<WorldInputs["interim"]>;
  load: () => HalvingData;
  save: (data: HalvingData) => void;
};

const mainIO: InputsIO = {
  price: getCurrentPrice,
  height: getCurrentBlockHeight,
  block: fetchBlockByHeight,
  interim: getInterimWeeklyData,
  load: loadHalvings,
  save: saveHalvings,
};

const findHalvings = async (
  now: number,
  io: InputsIO,
): Promise<{ currentBlock: number; halvings: HalvingData }> => {
  const currentBlock = await io.height(now);
  const known: HalvingData = { ...io.load() };
  for (const height of calculateHalvings(currentBlock)) {
    if (height.toString() in known) continue;
    known[height.toString()] = await io.block(height);
    io.save(known);
  }
  return { currentBlock, halvings: known };
};

/**
 * Start the three fetches; each result is merged as it lands, failures leave the gate shut.
 * Resolves true when price and block (with halvings) both landed: the chart can draw.
 */
export const fetchInputs = async (
  now: number,
  merge: (patch: Partial<WorldInputs>) => void,
  io: InputsIO = mainIO,
): Promise<boolean> => {
  const [price, block] = await Promise.all([
    io
      .price(now)
      .then((p) => {
        merge({ currentPrice: p.close });
        return Number.isFinite(p.close) && p.close > 0;
      })
      .catch(() => false),
    findHalvings(now, io)
      .then((found) => {
        merge(found);
        return Number.isFinite(found.currentBlock) && found.currentBlock > 0;
      })
      .catch(() => false),
    io
      .interim(now)
      .then((interim) => {
        merge({ interim });
      })
      .catch(() => undefined),
  ]);
  return price && block;
};

/**
 * §1h Chart · no data (Form n11). "waiting": the first 400ms, a quiet empty frame; "slow": still
 * no price, the caption reads "Loading prices…"; "failed": a fetch failed or 10s passed (the
 * caption and Try again; the chart retries by itself every 30s); "ready": price and block are in.
 */
export type InputsPhase = "waiting" | "slow" | "failed" | "ready";
export const LOADING_HOLD_MS = 400;
export const INPUTS_TIMEOUT_MS = 10_000;
export const INPUTS_RETRY_MS = 30_000;

export type Timers = {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const browserTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => {
    if (typeof handle === "number") clearTimeout(handle);
  },
};

/**
 * One attempt: runs the fetch and reports its phase. A late success after the timeout still turns
 * the chart ready. Returns a cancel that silences every later report.
 */
export const watchInputs = (
  run: () => Promise<boolean>,
  report: (phase: InputsPhase) => void,
  timers: Timers = browserTimers,
): (() => void) => {
  let live = true;
  let landed = false;
  const say = (phase: InputsPhase): void => {
    if (live && !landed) report(phase);
  };
  const hold = timers.set(() => {
    say("slow");
  }, LOADING_HOLD_MS);
  const give = timers.set(() => {
    say("failed");
  }, INPUTS_TIMEOUT_MS);
  void run().then((ok) => {
    timers.clear(hold);
    timers.clear(give);
    say(ok ? "ready" : "failed");
    landed = ok;
  });
  return () => {
    live = false;
    timers.clear(hold);
    timers.clear(give);
  };
};

export type WorldInputsState = {
  inputs: WorldInputs;
  phase: InputsPhase;
  /** "Try again": a fresh attempt, showing "Loading prices…" straight away. */
  retry: () => void;
};

export const useWorldInputs = (now: number): WorldInputsState => {
  const [inputs, setInputs] = useState<WorldInputs>(() => ({
    currentBlock: 0,
    currentPrice: 0,
    halvings: loadHalvings(),
    interim: [],
    now,
  }));
  const [phase, setPhase] = useState<InputsPhase>("waiting");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setPhase("slow");
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let live = true;
    const merge = (patch: Partial<WorldInputs>): void => {
      if (live) setInputs((prev) => ({ ...prev, ...patch }));
    };
    const cancel = watchInputs(async () => fetchInputs(now, merge), setPhase);
    return () => {
      live = false;
      cancel();
    };
  }, [now, attempt]);

  useEffect(() => {
    if (phase !== "failed") return undefined;
    const t = setTimeout(retry, INPUTS_RETRY_MS);
    return () => {
      clearTimeout(t);
    };
  }, [phase, retry]);

  return { inputs, phase, retry };
};
