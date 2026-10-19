/**
 * Market inputs the engine needs (price, block height, halvings, interim weeks), fetched with
 * main's own api.ts / halvings.ts, the same steps as main's use-current-price, use-halvings and
 * use-interim hooks. Each lands when it arrives; until price and block are in, the engine reports
 * its "not zero" gate and the chart shows its empty state (§1h).
 */
import { useEffect, useState } from "react";

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

/** Start the three fetches; each result is merged as it lands, failures leave the gate shut. */
export const fetchInputs = async (
  now: number,
  merge: (patch: Partial<WorldInputs>) => void,
  io: InputsIO = mainIO,
): Promise<void> => {
  await Promise.all([
    io
      .price(now)
      .then((p) => {
        merge({ currentPrice: p.close });
      })
      .catch(() => undefined),
    findHalvings(now, io)
      .then(merge)
      .catch(() => undefined),
    io
      .interim(now)
      .then((interim) => {
        merge({ interim });
      })
      .catch(() => undefined),
  ]);
};

export const useWorldInputs = (now: number): WorldInputs => {
  const [inputs, setInputs] = useState<WorldInputs>(() => ({
    currentBlock: 0,
    currentPrice: 0,
    halvings: loadHalvings(),
    interim: [],
    now,
  }));

  useEffect(() => {
    let live = true;
    const merge = (patch: Partial<WorldInputs>): void => {
      if (live) setInputs((prev) => ({ ...prev, ...patch }));
    };
    void fetchInputs(now, merge);
    return () => {
      live = false;
    };
  }, [now]);

  return inputs;
};
