import hashSum from "hash-sum";
import { useEffect } from "react";

import { useDrawdown } from "../../contexts/drawdown";
import { usePriceData } from "../../contexts/price";
import { useRender } from "../../contexts/render";
import { useTime } from "../../contexts/time";
import { useVolumeData } from "../../contexts/volume";
import volumeWorker from "../workers/volume-worker";

const useVolume = (): void => {
  const { renderDrawdownNormal, renderDrawdownQuantile } = useRender();
  const {
    setAverage,
    setLoadingVolumeData,
    setMedian,
    setVolumeCacheHash,
    setVolumeData,
    setVolumeNormal,
    setVolumeQuantile,
    setZero,
  } = useVolumeData();
  const { priceCacheHash, priceData } = usePriceData();
  const { bitcoin, costOfLiving, drawdownDate, inflation } = useDrawdown();
  const now = useTime();

  useEffect(() => {
    if (priceData.length === 0) return;
    const abortController = new AbortController();
    const { signal } = abortController;
    const volumeHash = hashSum({
      bitcoin,
      costOfLiving,
      drawdownDate,
      inflation,
      priceCacheHash,
    });
    volumeWorker(
      { bitcoin, costOfLiving, data: priceData, drawdownDate, inflation, now },
      signal,
      volumeHash,
    )
      .then(([id, newData]) => {
        if (signal.aborted || newData === undefined) {
          console.log("volume" + id + ":", "aborted");
        } else {
          console.log("volume" + id + ":", "success");
          setVolumeData(newData.volumeDataset);
          setVolumeCacheHash(volumeHash);
          setZero(newData.zero);
          setAverage(newData.average);
          setMedian(newData.median);
          if (!renderDrawdownQuantile) setVolumeQuantile([]);
          if (!renderDrawdownNormal) setVolumeNormal([]);
          setLoadingVolumeData(false);
        }
        return "success";
      })
      .catch(console.error);
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bitcoin, costOfLiving, drawdownDate, inflation, priceCacheHash]);
};

export default useVolume;
