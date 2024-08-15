import React, { createContext, useContext, useMemo, useState } from "react";

import {
  type DatasetList,
  type PriceData,
  type ProviderProperties,
} from "../types";

// eslint-disable-next-line functional/no-mixed-types
interface PriceDataContextType {
  loadingPriceData: boolean;
  priceCacheHash: string;
  priceData: PriceData;
  priceNormal: DatasetList;
  priceQuantile: DatasetList;
  setLoadingPriceData: React.Dispatch<React.SetStateAction<boolean>>;
  setPriceCacheHash: React.Dispatch<React.SetStateAction<string>>;
  setPriceData: React.Dispatch<React.SetStateAction<PriceData>>;
  setPriceNormal: React.Dispatch<React.SetStateAction<DatasetList>>;
  setPriceQuantile: React.Dispatch<React.SetStateAction<DatasetList>>;
}

// eslint-disable-next-line unicorn/no-null
const PriceDataContext = createContext<PriceDataContextType | null>(null);

export const PriceDataProvider: React.FC<ProviderProperties> = ({
  children,
}) => {
  const [priceData, setPriceData] = useState<PriceData>([]);
  const [priceQuantile, setPriceQuantile] = useState<DatasetList>([]);
  const [priceNormal, setPriceNormal] = useState<DatasetList>([]);
  const [loadingPriceData, setLoadingPriceData] = useState<boolean>(true);
  const [priceCacheHash, setPriceCacheHash] = useState<string>("");

  const value = useMemo(
    () => ({
      loadingPriceData,
      priceCacheHash,
      priceData,
      priceNormal,
      priceQuantile,
      setLoadingPriceData,
      setPriceCacheHash,
      setPriceData,
      setPriceNormal,
      setPriceQuantile,
    }),
    [priceData, priceQuantile, priceNormal, loadingPriceData, priceCacheHash],
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
