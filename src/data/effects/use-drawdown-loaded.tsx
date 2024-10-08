import { useEffect } from "react";

import { useComputedValues } from "../../contexts/computed";
import { useDrawdown } from "../../contexts/drawdown";

export const useDrawdownLoaded = (): void => {
  const { volumeStats } = useComputedValues();
  const { setLoadingVolumeData } = useDrawdown();
  useEffect(() => {
    if (volumeStats === null) return;
    setLoadingVolumeData(false);
  }, [volumeStats, setLoadingVolumeData]);
};
