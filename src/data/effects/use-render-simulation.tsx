import { useEffect } from "react";

import { useComputedValues } from "../../contexts/computed";
import { usePriceData } from "../../contexts/price";

export const useRenderSimulation = (): void => {
  const { priceData } = useComputedValues();
  const { setLoadingPriceData } = usePriceData();

  useEffect(() => {
    if (priceData !== null) {
      setLoadingPriceData(false);
    }
  }, [priceData, setLoadingPriceData]);
};
