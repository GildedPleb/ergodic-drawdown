import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { DEFAULT_SIMULATION_COUNT } from "../constants";
import { declaredSettings, isModelName, modelMap, models } from "../data/models";
import { type WalkTypes } from "../data/walks";
import { DEFAULT_YEAR_COUNT } from "../horizon";
import { type ModelNames, type ModelSettings, type ProviderProperties } from "../types";

// Fixed until the redesign. The model panel does not edit this.
export const simulationSeed = 1;

const initialModel = models[0];
if (initialModel === undefined) throw new Error("missing price model");

const freshSettings = (): { [key: string]: ModelSettings } => {
  const settings: { [key: string]: ModelSettings } = {};
  for (const key of Object.keys(modelMap)) {
    if (!isModelName(key)) throw new Error(`unknown model: ${key}`);
    settings[key] = declaredSettings(key);
  }
  return settings;
};

export interface ModelContextType {
  clampBottom: boolean;
  clampTop: boolean;
  loadingPriceData: boolean;
  model: ModelNames;
  pinnedWeeks: number | null;
  samples: number;
  pinSpan: (weeks: number, displayYears: number) => void;
  setClampBottom: React.Dispatch<React.SetStateAction<boolean>>;
  setClampTop: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingPriceData: React.Dispatch<React.SetStateAction<boolean>>;
  setModel: React.Dispatch<React.SetStateAction<ModelNames>>;
  setModelSettings: (name: ModelNames, values: ModelSettings) => void;
  setSamples: React.Dispatch<React.SetStateAction<number>>;
  setSetting: (name: ModelNames, key: string, value: number | string) => void;
  setShowModel: React.Dispatch<React.SetStateAction<boolean>>;
  setYears: React.Dispatch<React.SetStateAction<number>>;
  setVolatility: React.Dispatch<React.SetStateAction<number>>;
  setWalk: React.Dispatch<React.SetStateAction<WalkTypes>>;
  settings: ModelSettings;
  showModel: boolean;
  volatility: number;
  walk: WalkTypes;
  years: number;
}

const ModelContext = createContext<ModelContextType | null>(null);

export const ModelProvider: React.FC<ProviderProperties> = ({ children }) => {
  const [showModel, setShowModel] = useState<boolean>(false);
  const [loadingPriceData, setLoadingPriceData] = useState<boolean>(true);
  const [model, setModel] = useState<ModelNames>(initialModel.name);
  const [settingsByModel, setSettingsByModel] = useState(freshSettings);
  const setSetting = useCallback((name: ModelNames, key: string, value: number | string) => {
    setSettingsByModel((current) => {
      const previous = current[name];
      if (previous === undefined) throw new Error(`missing settings for ${name}`);
      if (previous[key] === value) return current;
      return { ...current, [name]: { ...previous, [key]: value } };
    });
  }, []);
  const setModelSettings = useCallback((name: ModelNames, values: ModelSettings) => {
    setSettingsByModel((current) => ({ ...current, [name]: declaredSettings(name, values) }));
  }, []);
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

  const settings = settingsByModel[model];
  const value = useMemo(() => {
    if (settings === undefined) throw new Error(`missing settings for ${model}`);
    return {
      clampBottom,
      clampTop,
      loadingPriceData,
      model,
      pinSpan,
      pinnedWeeks,
      samples,
      setClampBottom,
      setClampTop,
      setLoadingPriceData,
      setModel,
      setModelSettings,
      setSamples,
      setSetting,
      setShowModel,
      setVolatility,
      setWalk,
      setYears,
      settings,
      showModel,
      volatility,
      walk,
      years: yearsState,
    } satisfies ModelContextType;
  }, [
    showModel,
    clampBottom,
    clampTop,
    loadingPriceData,
    model,
    pinnedWeeks,
    samples,
    settings,
    volatility,
    walk,
    yearsState,
  ]);

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};

export const useModel = (): ModelContextType => {
  const context = useContext(ModelContext);
  if (context === null) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
};
