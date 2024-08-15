import { useEffect } from "react";

import { useDrawdown } from "../../contexts/drawdown";
import { useRender } from "../../contexts/render";
import { useVolumeData } from "../../contexts/volume";
import drawdownNormalDistributionWorker from "../workers/drawdown-normal-worker";

const useDrawdownNormal = (): void => {
  const { renderDrawdownNormal } = useRender();
  const { setVolumeNormal, volumeCacheHash, volumeData } = useVolumeData();
  const { drawdownDate } = useDrawdown();
  useEffect(() => {
    if (volumeData.length === 0 || !renderDrawdownNormal) return;
    const abortController = new AbortController();
    const { signal } = abortController;

    drawdownNormalDistributionWorker(
      volumeData,
      drawdownDate,
      signal,
      volumeCacheHash,
    )
      .then(([id, newData]) => {
        if (signal.aborted || newData === undefined) {
          console.log("volume normal" + id + ":", "aborted");
        } else {
          console.log("volume normal" + id + ":", "success");
          setVolumeNormal(newData);
        }
        return "success";
      })
      .catch(console.error);
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderDrawdownNormal, drawdownDate, volumeCacheHash]);
};

export default useDrawdownNormal;
