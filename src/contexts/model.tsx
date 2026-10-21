import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { DEFAULT_SIMULATION_COUNT } from "../constants";
import { DEFAULT_YEAR_COUNT } from "../horizon";
import { models } from "../data/models";
import { type WalkTypes } from "../data/walks";
import { type ModelNames, type ProviderProperties } from "../types";

// Fixed until the redesign. The model panel does not edit this.
export const simulationSeed = 1;

const initialModel = models[0];
if (initialModel === undefined) throw new Error("missing price model");

export interface ModelContextType {
  clampBottom: boolean;
  clampTop: boolean;
  loadingPriceData: boolean;
  minMaxMultiple: number;
  model: ModelNames;
  pinnedWeeks: number | null;
  samples: number;
  pinSpan: (weeks: number, displayYears: number) => void;
  setClampBottom: React.Dispatch<React.SetStateAction<boolean>>;
  setClampTop: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingPriceData: React.Dispatch<React.SetStateAction<boolean>>;
  setMinMaxMultiple: React.Dispatch<React.SetStateAction<number>>;
  setModel: React.Dispatch<React.SetStateAction<ModelNames>>;
  setSamples: React.Dispatch<React.SetStateAction<number>>;
  setShowModel: React.Dispatch<React.SetStateAction<boolean>>;
  setYears: React.Dispatch<React.SetStateAction<number>>;
  setVariable: React.Dispatch<React.SetStateAction<number>>;
  setVolatility: React.Dispatch<React.SetStateAction<number>>;
  setWalk: React.Dispatch<React.SetStateAction<WalkTypes>>;
  showModel: boolean;
  variable: number;
  volatility: number;
  walk: WalkTypes;
  years: number;
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
  const [yearsState, setYearsState] = useState<number>(DEFAULT_YEAR_COUNT);
  const [pinnedWeeks, setPinnedWeeks] = useState<number | null>(null);
  const setYears = useCallback<React.Dispatch<React.SetStateAction<number>>>((next) => {
    setPinnedWeeks(null);
    setYearsState(next);
  }, []);
  const pinSpan = useCallback((weeks: number, displayYears: number) => {
    setPinnedWeeks(weeks);
    setYearsState(displayYears);
  }, []);

  const value = useMemo(
    () =>
      ({
        clampBottom,
        clampTop,
        loadingPriceData,
        minMaxMultiple,
        model,
        pinSpan,
        pinnedWeeks,
        samples,
        setClampBottom,
        setClampTop,
        setLoadingPriceData,
        setMinMaxMultiple,
        setModel,
        setSamples,
        setShowModel,
        setVariable,
        setVolatility,
        setWalk,
        setYears,
        showModel,
        variable,
        volatility,
        walk,
        years: yearsState,
      }) satisfies ModelContextType,
    [
      showModel,
      clampBottom,
      clampTop,
      loadingPriceData,
      minMaxMultiple,
      model,
      pinnedWeeks,
      samples,
      variable,
      volatility,
      walk,
      yearsState,
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
