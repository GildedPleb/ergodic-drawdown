import hashSum from "hash-sum";
import { useEffect } from "react";

import { useModel } from "../../contexts/model";
import { usePriceData } from "../../contexts/price";
import { useRender } from "../../contexts/render";
import { useVolumeData } from "../../contexts/volume";
import { type Full, type Part } from "../../types";
import { useCurrentPrice } from "../datasets/current-price";
import { useHalvings } from "../datasets/halvings";
import { useMaxArray } from "../datasets/max-array";
import { useMinArray } from "../datasets/min-array";
import { simulationWorker } from "../workers/simulation-worker";

export const useSimulation = (): void => {
  const currentPrice = useCurrentPrice();
  const { currentBlock, halvings } = useHalvings();
  const {
    clampBottom,
    clampTop,
    epochCount,
    minMaxMultiple,
    model,
    samples,
    variable,
    volatility,
    walk,
  } = useModel();
  const minArray = useMinArray();
  const maxArray = useMaxArray();
  const {
    setLoadingPriceData,
    setPriceCacheHash,
    setPriceData,
    setPriceNormal,
    setPriceQuantile,
  } = usePriceData();
  const {
    renderDrawdownNormal,
    renderDrawdownQuantile,
    renderPriceNormal,
    renderPriceQuantile,
  } = useRender();
  const { setVolumeNormal, setVolumeQuantile } = useVolumeData();

  useEffect(() => {
    if (currentPrice === 0 || currentBlock === 0) return;
    const abortController = new AbortController();
    const { signal } = abortController;

    const full: Full = {
      clampBottom,
      clampTop,
      minMaxMultiple,
      model,
      variable,
      volatility,
      walk,
    };
    const cacheHashFull = hashSum(full);
    const part: Part = {
      currentPrice,
      epochCount,
      halvings,
      maxArray,
      minArray,
      samples,
    };
    const cacheHashPart = hashSum(part);
    simulationWorker(full, part, signal, cacheHashFull)
      .then(([id, newData]) => {
        if (signal.aborted || newData.length === 0) {
          console.log("simulation" + id + ":", "aborted");
        } else {
          console.log("simulation" + id + ":", "success");
          setPriceData(newData);
          setPriceCacheHash(cacheHashFull + cacheHashPart);
          if (!renderPriceNormal) setPriceNormal([]);
          if (!renderPriceQuantile) setPriceQuantile([]);
          if (!renderDrawdownQuantile) setVolumeQuantile([]);
          if (!renderDrawdownNormal) setVolumeNormal([]);
          setLoadingPriceData(false);
        }
        return "success";
      })
      .catch(console.error);

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPrice,
    clampBottom,
    clampTop,
    epochCount,
    model,
    samples,
    variable,
    volatility,
    walk,
    halvings,
    minMaxMultiple,
  ]);
};
