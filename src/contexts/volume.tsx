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
interface VolumeDataContextType {
  loadingVolumeData: boolean;
  setLoadingVolumeData: React.Dispatch<React.SetStateAction<boolean>>;
  volumeDataPool: SharedArrayPool;
}

// eslint-disable-next-line unicorn/no-null
const VolumeDataContext = createContext<VolumeDataContextType | null>(null);

export const VolumeDataProvider: React.FC<ProviderProperties> = ({
  children,
}) => {
  const [loadingVolumeData, setLoadingVolumeData] = useState<boolean>(true);
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
        loadingVolumeData,
        setLoadingVolumeData,
        volumeDataPool: poolReference.current,
      }) satisfies VolumeDataContextType,
    [loadingVolumeData],
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
