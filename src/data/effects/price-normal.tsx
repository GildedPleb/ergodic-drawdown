import { useEffect } from "react";

import { usePriceData } from "../../contexts/price";
import { useRender } from "../../contexts/render";
import { useTime } from "../../contexts/time";
import { priceNormalDistributionWorker } from "../workers/price-normal-worker";

export const usePriceNormal = (): void => {
  const { priceCacheHash, priceData, setPriceNormal } = usePriceData();
  const { renderPriceNormal } = useRender();
  const now = useTime();

  useEffect(() => {
    if (priceData.length === 0 || !renderPriceNormal) return;
    const abortController = new AbortController();
    const { signal } = abortController;

    priceNormalDistributionWorker(priceData, now, signal, priceCacheHash)
      .then(([id, newData]) => {
        if (signal.aborted || newData === undefined) {
          console.log("price normal" + id + ":", "aborted");
        } else {
          console.log("price normal" + id + ":", "success");
          setPriceNormal(newData);
        }
        return "success";
      })
      .catch(console.error);
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderPriceNormal, now, priceCacheHash]);
};
