import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import SharedArrayPool from "../classes/shared-stack-cache-pool";
import {
  DEFAULT_EPOCH_COUNT,
  DEFAULT_SIMULATION_COUNT,
  WEEKS_PER_EPOCH,
} from "../constants";
import { type ProviderProperties } from "../types";

// eslint-disable-next-line functional/no-mixed-types
interface PriceDataContextType {
  loadingPriceData: boolean;
  priceDataPool: SharedArrayPool;
  setLoadingPriceData: React.Dispatch<React.SetStateAction<boolean>>;
}

// eslint-disable-next-line unicorn/no-null
const PriceDataContext = createContext<PriceDataContextType | null>(null);

export const PriceDataProvider: React.FC<ProviderProperties> = ({
  children,
}) => {
  const [loadingPriceData, setLoadingPriceData] = useState<boolean>(true);
  const poolReference = useRef<SharedArrayPool>(
    new SharedArrayPool(
      DEFAULT_EPOCH_COUNT,
      DEFAULT_SIMULATION_COUNT,
      WEEKS_PER_EPOCH,
    ),
  );

  const value = useMemo(
    () =>
      ({
        loadingPriceData,
        priceDataPool: poolReference.current,
        setLoadingPriceData,
      }) satisfies PriceDataContextType,
    [loadingPriceData],
  );

  return (
    <PriceDataContext.Provider value={value}>
      {children}
    </PriceDataContext.Provider>
  );
};

export const usePriceData = (): PriceDataContextType => {
  const context = useContext(PriceDataContext);
  if (context === null) {
    throw new Error("usePriceData must be used within a PriceDataProvider");
  }
  return context;
};
