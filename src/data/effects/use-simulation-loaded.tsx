import { useEffect } from "react";

import { useComputedValues } from "../../contexts/computed";
import { useModel } from "../../contexts/model";

export const useSimulationLoaded = (): void => {
  const { simulationStats } = useComputedValues();
  const { setLoadingPriceData } = useModel();
  useEffect(() => {
    if (simulationStats === null) return;
    setLoadingPriceData(false);
  }, [simulationStats, setLoadingPriceData]);
};
