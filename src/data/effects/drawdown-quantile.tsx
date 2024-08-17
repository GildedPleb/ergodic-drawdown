import { useEffect } from "react";

import { useDrawdown } from "../../contexts/drawdown";
import { useRender } from "../../contexts/render";
import { useVolumeData } from "../../contexts/volume";
import { drawdownQuantileWorker } from "../workers/drawdown-quantile-worker";

export const useDrawdownQuantile = (): void => {
  const { renderDrawdownQuantile } = useRender();
  const { setVolumeQuantile, volumeCacheHash, volumeData } = useVolumeData();
  const { drawdownDate } = useDrawdown();

  useEffect(() => {
    if (volumeData.length === 0 || !renderDrawdownQuantile) return;
    const abortController = new AbortController();
    const { signal } = abortController;

    drawdownQuantileWorker(volumeData, drawdownDate, signal, volumeCacheHash)
      .then(([id, newData]) => {
        if (signal.aborted || newData === undefined) {
          console.log("volume quantile" + id + ":", "aborted");
        } else {
          console.log("volume quantile" + id + ":", "success");
          setVolumeQuantile(newData);
        }
        return "success";
      })
      .catch(console.error);
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderDrawdownQuantile, drawdownDate, volumeCacheHash]);
};
