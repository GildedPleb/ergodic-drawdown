import { useEffect } from "react";

import { usePriceData } from "../../contexts/price";
import { useRender } from "../../contexts/render";
import { useTime } from "../../contexts/time";
import priceQuantileWorker from "../workers/price-quantile-worker";

const usePriceQuantile = (): void => {
  const { priceCacheHash, priceData, setPriceQuantile } = usePriceData();
  const { renderPriceQuantile } = useRender();
  const now = useTime();

  useEffect(() => {
    if (priceData.length === 0 || !renderPriceQuantile) return;
    const abortController = new AbortController();
    const { signal } = abortController;

    priceQuantileWorker(priceData, now, signal, priceCacheHash)
      .then(([id, newData]) => {
        if (signal.aborted || newData === undefined) {
          console.log("price quantile" + id + ":", "aborted");
        } else {
          console.log("price quantile" + id + ":", "success");
          setPriceQuantile(newData);
        }
        return "success";
      })
      .catch(console.error);
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderPriceQuantile, now, priceCacheHash]);
};

export default usePriceQuantile;
