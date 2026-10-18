import { useEffect } from "react";

import { useDrawdown } from "../../contexts/drawdown";
import { useEngineSelector } from "../../hooks/use-engine";

export const useDrawdownLoaded = (): void => {
  const volumeStats = useEngineSelector((snapshot) => snapshot.volumeStats);
  const { setLoadingVolumeData } = useDrawdown();
  useEffect(() => {
    if (volumeStats === null) return;
    setLoadingVolumeData(false);
  }, [volumeStats, setLoadingVolumeData]);
};
