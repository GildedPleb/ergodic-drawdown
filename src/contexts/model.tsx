import React, { createContext, useContext, useMemo, useState } from "react";

import { DEFAULT_EPOCH_COUNT, DEFAULT_SIMULATION_COUNT } from "../constants";
import { models } from "../data/models";
import { type ProviderProperties } from "../types";

// eslint-disable-next-line functional/no-mixed-types
interface ModelContextType {
  clampBottom: boolean;
  clampTop: boolean;
  epochCount: number;
  minMaxMultiple: number;
  model: string;
  samples: number;
  setClampBottom: React.Dispatch<React.SetStateAction<boolean>>;
  setClampTop: React.Dispatch<React.SetStateAction<boolean>>;
  setEpochCount: React.Dispatch<React.SetStateAction<number>>;
  setMinMaxMultiple: React.Dispatch<React.SetStateAction<number>>;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  setSamples: React.Dispatch<React.SetStateAction<number>>;
  setVariable: React.Dispatch<React.SetStateAction<number>>;
  setVolatility: React.Dispatch<React.SetStateAction<number>>;
  setWalk: React.Dispatch<React.SetStateAction<string>>;
  variable: number;
  volatility: number;
  walk: string;
}

// eslint-disable-next-line unicorn/no-null
const ModelContext = createContext<ModelContextType | null>(null);

export const ModelProvider: React.FC<ProviderProperties> = ({ children }) => {
  const [model, setModel] = useState<string>(models[2].modelType);
  const [variable, setVariable] = useState<number>(0);
  const [minMaxMultiple, setMinMaxMultiple] = useState<number>(3);
  const [walk, setWalk] = useState<string>("Bubble");
  const [clampTop, setClampTop] = useState<boolean>(false);
  const [clampBottom, setClampBottom] = useState<boolean>(false);
  const [volatility, setVolatility] = useState<number>(0.1);
  const [samples, setSamples] = useState<number>(DEFAULT_SIMULATION_COUNT);
  const [epochCount, setEpochCount] = useState<number>(DEFAULT_EPOCH_COUNT);

  const value = useMemo(
    () => ({
      clampBottom,
      clampTop,
      epochCount,
      minMaxMultiple,
      model,
      samples,
      setClampBottom,
      setClampTop,
      setEpochCount,
      setMinMaxMultiple,
      setModel,
      setSamples,
      setVariable,
      setVolatility,
      setWalk,
      variable,
      volatility,
      walk,
    }),
    [
      clampBottom,
      clampTop,
      epochCount,
      minMaxMultiple,
      model,
      samples,
      variable,
      volatility,
      walk,
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
