import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";
import { useMemo } from "react";

import { useModel } from "../../contexts/model";
import { useTime } from "../../contexts/time";
import { weeksSinceLastHalving } from "../../helpers";
import { modelMap } from "../models";
import { useCurrentPrice } from "./current-price";
import { useHalvings } from "./halvings";

const lruCache = new LRUCache<string, Float64Array>({ max: 5 });

export const useMaxArray = (): Float64Array => {
  const { currentBlock, halvings } = useHalvings();
  const { epochCount, minMaxMultiple, model, variable } = useModel();
  const currentPrice = useCurrentPrice();
  const now = useTime();

  return useMemo(() => {
    if (currentBlock === 0 || currentPrice === 0) return new Float64Array();
    console.time("max");
    const hash = hashSum({
      currentBlock,
      currentPrice,
      epochCount,
      halvings,
      minMaxMultiple,
      model,
      now,
      variable,
    });
    const previous = lruCache.get(hash);
    if (previous !== undefined) {
      console.timeEnd("max");
      return previous;
    }
    const lastHalving = weeksSinceLastHalving(halvings);
    const datasetLength = epochCount * 208 - lastHalving;
    const minPoints = new Float64Array(datasetLength);

    for (let index = 0; index < datasetLength; index++) {
      minPoints[index] = modelMap[model].maxPrice({
        currentBlock,
        currentPrice,
        minMaxMultiple,
        now,
        variable,
        week: index,
      });
    }
    lruCache.set(hash, minPoints);
    console.timeEnd("max");
    return minPoints;
  }, [
    currentBlock,
    currentPrice,
    epochCount,
    halvings,
    minMaxMultiple,
    model,
    now,
    variable,
  ]);
};
