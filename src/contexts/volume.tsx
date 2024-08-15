import React, { createContext, useContext, useMemo, useState } from "react";

import {
  type DatasetList,
  type ProviderProperties,
  type VolumeData,
} from "../types";

// eslint-disable-next-line functional/no-mixed-types
interface VolumeDataContextType {
  average: number | undefined;
  loadingVolumeData: boolean;
  median: number | undefined;
  setAverage: React.Dispatch<React.SetStateAction<number | undefined>>;
  setLoadingVolumeData: React.Dispatch<React.SetStateAction<boolean>>;
  setMedian: React.Dispatch<React.SetStateAction<number | undefined>>;
  setVolumeCacheHash: React.Dispatch<React.SetStateAction<string>>;
  setVolumeData: React.Dispatch<React.SetStateAction<VolumeData>>;
  setVolumeNormal: React.Dispatch<React.SetStateAction<DatasetList>>;
  setVolumeQuantile: React.Dispatch<React.SetStateAction<DatasetList>>;
  setZero: React.Dispatch<React.SetStateAction<number>>;
  volumeCacheHash: string;
  volumeData: VolumeData;
  volumeNormal: DatasetList;
  volumeQuantile: DatasetList;
  zero: number;
}

// eslint-disable-next-line unicorn/no-null
const VolumeDataContext = createContext<VolumeDataContextType | null>(null);

export const VolumeDataProvider: React.FC<ProviderProperties> = ({
  children,
}) => {
  const [volumeData, setVolumeData] = useState<VolumeData>([]);
  const [volumeQuantile, setVolumeQuantile] = useState<DatasetList>([]);
  const [volumeNormal, setVolumeNormal] = useState<DatasetList>([]);
  const [loadingVolumeData, setLoadingVolumeData] = useState<boolean>(true);
  const [zero, setZero] = useState<number>(0);
  const [average, setAverage] = useState<number | undefined>();
  const [median, setMedian] = useState<number | undefined>();
  const [volumeCacheHash, setVolumeCacheHash] = useState<string>("");

  const value = useMemo(
    () => ({
      average,
      loadingVolumeData,
      median,
      setAverage,
      setLoadingVolumeData,
      setMedian,
      setVolumeCacheHash,
      setVolumeData,
      setVolumeNormal,
      setVolumeQuantile,
      setZero,
      volumeCacheHash,
      volumeData,
      volumeNormal,
      volumeQuantile,
      zero,
    }),
    [
      average,
      loadingVolumeData,
      median,
      volumeCacheHash,
      volumeData,
      volumeNormal,
      volumeQuantile,
      zero,
    ],
  );

  return (
    <VolumeDataContext.Provider value={value}>
      {children}
    </VolumeDataContext.Provider>
  );
};

export const useVolumeData = (): VolumeDataContextType => {
  const context = useContext(VolumeDataContext);
  if (context === null) {
    throw new Error("useVolumeData must be used within a VolumeDataProvider");
  }
  return context;
};
