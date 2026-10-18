import { useEffect } from "react";

import { useModel } from "../../contexts/model";
import { useEngineSelector } from "../../hooks/use-engine";

export const useSimulationLoaded = (): void => {
  const simulationStats = useEngineSelector((snapshot) => snapshot.simulationStats);
  const { setLoadingPriceData } = useModel();
  useEffect(() => {
    if (simulationStats === null) return;
    setLoadingPriceData(false);
  }, [simulationStats, setLoadingPriceData]);
};
