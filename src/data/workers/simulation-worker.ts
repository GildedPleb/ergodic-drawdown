/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable security/detect-object-injection */
/* eslint-disable unicorn/prefer-spread */
import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";

import Dynamic2DArray from "../../dynamic-array";
import {
  applyModel,
  normalizePrice,
  timeout,
  weeksSinceLastHalving,
} from "../../helpers";
import { type Full, type Part, type PriceData } from "../../types";
import { walks } from "../walks";

const signalState = { aborted: false };

const SUSPEND_CONTROL = 50;

const lruCache = new LRUCache<string, Dynamic2DArray>({ max: 2 });

// TO CONSIDER:
// 1. Throw everything into a new LRU cache: sims, rows, walks, and segments. Basically, user action determines the bunk of the cache.
// 2. Test to compare this with the 2dArray class for speed. 2D Array gaurantees (actually, does it? It only does with unlimited LRU cache... maybe its a wash) no one can model fit, LRU cache protects but does not gaurantee.
// 3. Preform tests on all the above to ensure the best way forward. Be sure to note SPACE for all tests.
// 4. Put the Walks in a 2D Array cache... test if better faster in control environment first.
// 5. When rendering in rapid successtion, check to see if the work done is saved up to that point in the cache. It might be worth investigating saves tothe cache upon abort signal

const simulationWorker = async (
  { clampBottom, clampTop, volatility, walk }: Full,
  { currentPrice, epochCount, halvings, maxArray, minArray, samples }: Part,
  signal: AbortSignal,
  cacheId: string,
): Promise<[string, PriceData]> => {
  const id = hashSum(Math.random());
  signalState.aborted = false;

  // eslint-disable-next-line functional/functional-parameters
  const AbortAction = (): void => {
    signal.removeEventListener("abort", AbortAction);
    console.warn("Aborted", id);
    signalState.aborted = true;
  };

  signal.addEventListener("abort", AbortAction);

  const walking = walks[walk];
  const lastHalving = weeksSinceLastHalving(halvings);
  const data: Dynamic2DArray = lruCache.has(cacheId)
    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      lruCache.get(cacheId)!
    : new Dynamic2DArray(
        epochCount,
        samples,
        undefined,
        undefined,
        undefined,
        1.1,
      );

  console.time("simulation" + id);
  const graphs: PriceData = [];
  data.resizeActive(epochCount, samples);
  const fullSetTest = data.getRow(samples - 1);
  if (fullSetTest !== undefined) {
    for (let index = 0; index < samples; index++) {
      // @ts-expect-error because we checked the last row, all other rows are full
      graphs.push(data.getRow(index).subarray(lastHalving));
    }
    signal.removeEventListener("abort", AbortAction);
    console.timeEnd("simulation" + id);
    return [id, graphs];
  }

  for (let index = 0; index < samples; index++) {
    if (index % SUSPEND_CONTROL === 0) await timeout();
    let innerGraph: Float64Array = new Float64Array(0);
    const row = data.getRow(index);
    if (row !== undefined) {
      graphs.push(row.subarray(lastHalving));
      continue;
    }
    for (let innerIndex = 0; innerIndex < epochCount; innerIndex++) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (signalState.aborted) {
        console.timeEnd("simulation" + id);
        return [id, []];
      } else {
        // console.log("loop sim", now);
      }
      const segment = data.get(innerIndex, index);
      if (segment !== undefined) {
        const existing = new Float64Array(innerGraph.length + segment.length);
        existing.set(innerGraph);
        existing.set(segment, innerGraph.length);
        innerGraph = existing;
        continue;
      }
      const innerStartingPrice = normalizePrice({
        maxArray,
        minArray,
        priceToNormalize: innerGraph.at(-1) ?? currentPrice,
        week: innerGraph.length === 0 ? 0 : innerGraph.length - lastHalving,
      });
      const rawWalk = walking({
        clampBottom,
        clampTop,
        start: innerStartingPrice,
        startWeek: innerGraph.length === 0 ? lastHalving : 0,
        volatility,
      });
      const applied = applyModel({
        maxArray,
        minArray,
        normalizedPrices: rawWalk,
        offset: lastHalving,
        week: innerGraph.length,
      });
      data.set(innerIndex, index, applied);
      const newWalk = new Float64Array(innerGraph.length + rawWalk.length);
      newWalk.set(innerGraph);
      newWalk.set(applied, innerGraph.length);
      innerGraph = newWalk;
    }
    graphs.push(innerGraph.subarray(lastHalving));
  }
  lruCache.set(cacheId, data);
  console.timeEnd("simulation" + id);
  signal.removeEventListener("abort", AbortAction);
  return [id, graphs];
};

export default simulationWorker;
