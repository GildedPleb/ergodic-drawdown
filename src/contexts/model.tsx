import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import GrowableSharedArray from "../classes/growable-shared-array";
import {
  DEFAULT_EPOCH_COUNT,
  DEFAULT_SIMULATION_COUNT,
  WEEKS_PER_EPOCH,
} from "../constants";
import { models } from "../data/models";
import { type ModelNames, type ProviderProperties } from "../types";

// eslint-disable-next-line functional/no-mixed-types
export interface ModelContextType {
  clampBottom: boolean;
  clampTop: boolean;
  epochCount: number;
  loadingPriceData: boolean;
  minMaxMultiple: number;
  model: string;
  samples: number;
  setClampBottom: React.Dispatch<React.SetStateAction<boolean>>;
  setClampTop: React.Dispatch<React.SetStateAction<boolean>>;
  setEpochCount: React.Dispatch<React.SetStateAction<number>>;
  setLoadingPriceData: React.Dispatch<React.SetStateAction<boolean>>;
  setMinMaxMultiple: React.Dispatch<React.SetStateAction<number>>;
  setModel: React.Dispatch<React.SetStateAction<ModelNames>>;
  setSamples: React.Dispatch<React.SetStateAction<number>>;
  setShowModel: React.Dispatch<React.SetStateAction<boolean>>;
  setVariable: React.Dispatch<React.SetStateAction<number>>;
  setVolatility: React.Dispatch<React.SetStateAction<number>>;
  setWalk: React.Dispatch<React.SetStateAction<string>>;
  showModel: boolean;
  simulationData: GrowableSharedArray;
  variable: number;
  volatility: number;
  walk: string;
}

// eslint-disable-next-line unicorn/no-null
const ModelContext = createContext<ModelContextType | null>(null);

export const ModelProvider: React.FC<ProviderProperties> = ({ children }) => {
  const [showModel, setShowModel] = useState<boolean>(false);
  const [loadingPriceData, setLoadingPriceData] = useState<boolean>(true);
  const [model, setModel] = useState<ModelNames>(models[0].modelType);
  const [variable, setVariable] = useState<number>(0);
  const [minMaxMultiple, setMinMaxMultiple] = useState<number>(3);
  const [walk, setWalk] = useState<string>("Bubble");
  const [clampTop, setClampTop] = useState<boolean>(true);
  const [clampBottom, setClampBottom] = useState<boolean>(true);
  const [volatility, setVolatility] = useState<number>(0.1);
  const [samples, setSamples] = useState<number>(DEFAULT_SIMULATION_COUNT);
  const [epochCount, setEpochCount] = useState<number>(DEFAULT_EPOCH_COUNT);
  const simulationData = useRef<GrowableSharedArray>(
    new GrowableSharedArray(
      DEFAULT_EPOCH_COUNT,
      DEFAULT_SIMULATION_COUNT,
      WEEKS_PER_EPOCH,
    ),
  );

  const value = useMemo(
    () =>
      ({
        clampBottom,
        clampTop,
        epochCount,
        loadingPriceData,
        minMaxMultiple,
        model,
        samples,
        setClampBottom,
        setClampTop,
        setEpochCount,
        setLoadingPriceData,
        setMinMaxMultiple,
        setModel,
        setSamples,
        setShowModel,
        setVariable,
        setVolatility,
        setWalk,
        showModel,
        simulationData: simulationData.current,
        variable,
        volatility,
        walk,
      }) satisfies ModelContextType,
    [
      showModel,
      clampBottom,
      clampTop,
      epochCount,
      minMaxMultiple,
      model,
      samples,
      variable,
      volatility,
      walk,
      loadingPriceData,
    ],
  );

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
};

export const useModel = (): ModelContextType => {
  const context = useContext(ModelContext);
  if (context === null) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
};
