import React, { createContext, useContext, useMemo, useRef, useState } from "react";

import GrowableSharedArray from "../classes/growable-shared-array";
import { DEFAULT_EPOCH_COUNT, DEFAULT_SIMULATION_COUNT, WEEKS_PER_EPOCH } from "../constants";
import { models } from "../data/models";
import { type WalkTypes } from "../data/walks";
import { WALK_STATE_LENGTH } from "../data/walks/prng";
import { type ModelNames, type ProviderProperties } from "../types";

// Fixed until the redesign. The model panel does not edit this.
export const simulationSeed = 1;

const initialModel = models[0];
if (initialModel === undefined) throw new Error("missing price model");

export interface ModelContextType {
  clampBottom: boolean;
  clampTop: boolean;
  epochCount: number;
  loadingPriceData: boolean;
  minMaxMultiple: number;
  model: ModelNames;
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
  setWalk: React.Dispatch<React.SetStateAction<WalkTypes>>;
  showModel: boolean;
  simulationData: GrowableSharedArray;
  variable: number;
  volatility: number;
  walk: WalkTypes;
  walkState: GrowableSharedArray;
}

const ModelContext = createContext<ModelContextType | null>(null);

export const ModelProvider: React.FC<ProviderProperties> = ({ children }) => {
  const [showModel, setShowModel] = useState<boolean>(false);
  const [loadingPriceData, setLoadingPriceData] = useState<boolean>(true);
  const [model, setModel] = useState<ModelNames>(initialModel.modelType);
  const [variable, setVariable] = useState<number>(0);
  const [minMaxMultiple, setMinMaxMultiple] = useState<number>(3);
  const [walk, setWalk] = useState<WalkTypes>("Bubble");
  const [clampTop, setClampTop] = useState<boolean>(false);
  const [clampBottom, setClampBottom] = useState<boolean>(false);
  const [volatility, setVolatility] = useState<number>(0.1);
  const [samples, setSamples] = useState<number>(DEFAULT_SIMULATION_COUNT);
  const [epochCount, setEpochCount] = useState<number>(DEFAULT_EPOCH_COUNT);
  const simulationData = useRef<GrowableSharedArray>(
    new GrowableSharedArray(DEFAULT_EPOCH_COUNT, DEFAULT_SIMULATION_COUNT, WEEKS_PER_EPOCH),
  );
  const walkState = useRef<GrowableSharedArray>(
    new GrowableSharedArray(DEFAULT_EPOCH_COUNT, DEFAULT_SIMULATION_COUNT, WALK_STATE_LENGTH),
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
        walkState: walkState.current,
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

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};

export const useModel = (): ModelContextType => {
  const context = useContext(ModelContext);
  if (context === null) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
};
