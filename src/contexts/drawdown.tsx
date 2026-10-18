import React, { createContext, useContext, useMemo, useState } from "react";

import { MS_PER_YEAR } from "../constants";
import { loadHalvings } from "../halvings";
import {
  type OneOffFiatVariable,
  type OneOffItem,
  type ProviderProperties,
  type ReoccurringItem,
} from "../types";
export interface DrawdownContextType {
  bitcoin: number;
  inflation: number;
  loadingVolumeData: boolean;
  oneOffFiatVariables: OneOffFiatVariable[];
  oneOffItems: OneOffItem[];
  reoccurringItems: ReoccurringItem[];
  setBitcoin: React.Dispatch<React.SetStateAction<number>>;
  setInflation: React.Dispatch<React.SetStateAction<number>>;
  setLoadingVolumeData: React.Dispatch<React.SetStateAction<boolean>>;
  setOneOffFiatVariables: React.Dispatch<React.SetStateAction<OneOffFiatVariable[]>>;
  setOneOffItems: React.Dispatch<React.SetStateAction<OneOffItem[]>>;
  setReoccurringItems: React.Dispatch<React.SetStateAction<ReoccurringItem[]>>;
  setShowDrawdown: React.Dispatch<React.SetStateAction<boolean>>;
  showDrawdown: boolean;
}

const DrawdownContext = createContext<DrawdownContextType | null>(null);

const loadedHalvings = loadHalvings();

const reward = 50 / 2 ** Object.keys(loadedHalvings).length;

export const DrawdownProvider: React.FC<ProviderProperties> = ({ children }) => {
  const [showDrawdown, setShowDrawdown] = useState<boolean>(true);
  const [loadingVolumeData, setLoadingVolumeData] = useState<boolean>(true);
  const [bitcoin, setBitcoin] = useState<number>(reward);
  const [inflation, setInflation] = useState<number>(8);
  const [reoccurringItems, setReoccurringItems] = useState<ReoccurringItem[]>([
    {
      active: true,
      annualAmount: 100_000,
      annualPercentChange: 0,
      effective: new Date(Date.now() + 8 * MS_PER_YEAR),
      expense: true,
      id: "item-1",
      isFiat: true,
      name: "Live off Bitcoin",
    },
  ]);

  const [oneOffItems, setOneOffItems] = useState<OneOffItem[]>([]);

  const [oneOffFiatVariables, setOneOffFiatVariables] = useState<OneOffFiatVariable[]>([]);

  const value = useMemo(
    () =>
      ({
        bitcoin,
        inflation,
        loadingVolumeData,
        oneOffFiatVariables,
        oneOffItems,
        reoccurringItems,
        setBitcoin,
        setInflation,
        setLoadingVolumeData,
        setOneOffFiatVariables,
        setOneOffItems,
        setReoccurringItems,
        setShowDrawdown,
        showDrawdown,
      }) satisfies DrawdownContextType,
    [
      bitcoin,
      inflation,
      loadingVolumeData,
      oneOffFiatVariables,
      oneOffItems,
      reoccurringItems,
      showDrawdown,
    ],
  );

  return <DrawdownContext.Provider value={value}>{children}</DrawdownContext.Provider>;
};

export const useDrawdown = (): DrawdownContextType => {
  const context = useContext(DrawdownContext);
  if (context === null) {
    throw new Error("useDrawdown must be used within a DrawdownProvider");
  }
  return context;
};
