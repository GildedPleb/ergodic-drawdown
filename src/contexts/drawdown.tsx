import React, { createContext, useContext, useMemo, useState } from "react";

import { MS_PER_YEAR } from "../constants";
import { loadHalvings } from "../helpers";
import { type ProviderProperties } from "../types";

// eslint-disable-next-line functional/no-mixed-types
interface DrawdownContextType {
  bitcoin: number;
  costOfLiving: number;
  drawdownDate: number;
  inflation: number;
  setBitcoin: React.Dispatch<React.SetStateAction<number>>;
  setCostOfLiving: React.Dispatch<React.SetStateAction<number>>;
  setDrawdownDate: React.Dispatch<React.SetStateAction<number>>;
  setInflation: React.Dispatch<React.SetStateAction<number>>;
}

// eslint-disable-next-line unicorn/no-null
const DrawdownContext = createContext<DrawdownContextType | null>(null);

const loadedHalvings = loadHalvings();

const reward = 50 / 2 ** Object.keys(loadedHalvings).length;

export const DrawdownProvider: React.FC<ProviderProperties> = ({
  children,
}) => {
  const [bitcoin, setBitcoin] = useState<number>(reward);
  const [inflation, setInflation] = useState<number>(8);
  const [costOfLiving, setCostOfLiving] = useState<number>(100_000);
  const [drawdownDate, setDrawdownDate] = useState<number>(
    Date.now() + 8 * MS_PER_YEAR,
  );

  const value = useMemo(
    () => ({
      bitcoin,
      costOfLiving,
      drawdownDate,
      inflation,
      setBitcoin,
      setCostOfLiving,
      setDrawdownDate,
      setInflation,
    }),
    [bitcoin, costOfLiving, drawdownDate, inflation],
  );

  return (
    <DrawdownContext.Provider value={value}>
      {children}
    </DrawdownContext.Provider>
  );
};

export const useDrawdown = (): DrawdownContextType => {
  const context = useContext(DrawdownContext);
  if (context === null) {
    throw new Error("useDrawdown must be used within a DrawdownProvider");
  }
  return context;
};
