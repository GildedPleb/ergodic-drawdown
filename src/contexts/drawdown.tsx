import { LRUCache } from "lru-cache";
import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import GrowableSharedArray from "../classes/growable-shared-array";
import type VariableDrawdownCache from "../classes/variable-drawdown-cache";
import { type VariableDrawdownFinal } from "../classes/variable-drawdown-final";
import {
  DEFAULT_EPOCH_COUNT,
  DEFAULT_SIMULATION_COUNT,
  MS_PER_YEAR,
  WEEKS_PER_EPOCH,
} from "../constants";
import { loadHalvings } from "../helpers";
import {
  type OneOffFiatVariable,
  type OneOffItem,
  type ProviderProperties,
  type ReoccurringItem,
} from "../types"; // eslint-disable-next-line functional/no-mixed-types
export interface DrawdownContextType {
  bitcoin: number;
  drawdownData: GrowableSharedArray;
  finalVariableCache: LRUCache<string, VariableDrawdownFinal>;
  inflation: number;
  loadingVolumeData: boolean;
  oneOffFiatVariables: OneOffFiatVariable[];
  oneOffItems: OneOffItem[];
  reoccurringItems: ReoccurringItem[];
  setBitcoin: React.Dispatch<React.SetStateAction<number>>;
  setInflation: React.Dispatch<React.SetStateAction<number>>;
  setLoadingVolumeData: React.Dispatch<React.SetStateAction<boolean>>;
  setOneOffFiatVariables: React.Dispatch<
    React.SetStateAction<OneOffFiatVariable[]>
  >;
  setOneOffItems: React.Dispatch<React.SetStateAction<OneOffItem[]>>;
  setReoccurringItems: React.Dispatch<React.SetStateAction<ReoccurringItem[]>>;
  setShowDrawdown: React.Dispatch<React.SetStateAction<boolean>>;
  showDrawdown: boolean;
  variableDrawdownCache: LRUCache<string, VariableDrawdownCache>;
}

// eslint-disable-next-line unicorn/no-null
const DrawdownContext = createContext<DrawdownContextType | null>(null);

const loadedHalvings = loadHalvings();

const reward = 50 / 2 ** Object.keys(loadedHalvings).length;

export const DrawdownProvider: React.FC<ProviderProperties> = ({
  children,
}) => {
  const [showDrawdown, setShowDrawdown] = useState<boolean>(true);
  const [loadingVolumeData, setLoadingVolumeData] = useState<boolean>(true);
  const drawdownData = useRef(
    new GrowableSharedArray(
      DEFAULT_EPOCH_COUNT,
      DEFAULT_SIMULATION_COUNT,
      WEEKS_PER_EPOCH,
    ),
  );
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
    // {
    //   active: false,
    //   annualAmount: 1,
    //   annualPercentChange: 0,
    //   effective: new Date(Date.now() + 24.5 * MS_PER_YEAR),
    //   end: new Date(Date.now() + 25 * MS_PER_YEAR),
    //   expense: false,
    //   id: "item-2",
    //   isFiat: false,
    //   name: "Basic Bitcoin Reoccurring",
    // },
  ]);

  const [oneOffItems, setOneOffItems] = useState<OneOffItem[]>([
    // {
    //   active: false,
    //   amountToday: 12,
    //   effective: new Date(Date.now() + 20 * MS_PER_YEAR),
    //   expense: false,
    //   id: "item-3",
    //   isFiat: false,
    //   name: "Basic Fiat One-off",
    // },
    // {
    //   active: false,
    //   amountToday: 500_000,
    //   effective: new Date(Date.now() + 20 * MS_PER_YEAR),
    //   expense: true,
    //   id: "item-4",
    //   isFiat: true,
    //   name: "Basic Bitcoin One-off",
    // },
  ]);

  const [oneOffFiatVariables, setOneOffFiatVariables] = useState<
    OneOffFiatVariable[]
  >([
    // {
    //   active: true,
    //   amountToday: 250_000,
    //   btcWillingToSpend: 2,
    //   delay: 0,
    //   hash: "3ccbd62a",
    //   id: "item-0",
    //   name: "New Back House",
    //   start: 100,
    // },
    // {
    //   active: true,
    //   amountToday: 40_000,
    //   btcWillingToSpend: 0.01,
    //   delay: 0,
    //   hash: "0f0dd5a8",
    //   id: "30f01e9e",
    //   name: "New Item",
    //   start: 100,
    // },
    // {
    //   active: true,
    //   amountToday: 40_000,
    //   btcWillingToSpend: 0.1,
    //   delay: 90,
    //   hash: "item-2",
    //   id: "item-2",
    //   name: "Basic Variable 2",
    //   start: 100,
    // },
    // {
    //   active: true,
    //   amountToday: 80_000,
    //   btcWillingToSpend: 0.1,
    //   delay: 90,
    //   hash: "item-3",
    //   id: "item-3",
    //   name: "Basic Variable 3",
    //   start: 100,
    // },
    // {
    //   active: true,
    //   amountToday: 160_000,
    //   btcWillingToSpend: 0.1,
    //   delay: 90,
    //   hash: "item-4",
    //   id: "item-4",
    //   name: "Basic Variable 4",
    //   start: 100,
    // },
    // {
    //   active: true,
    //   amountToday: 320_000,
    //   btcWillingToSpend: 0.1,
    //   delay: 90,
    //   hash: "item-5",
    //   id: "item-5",
    //   name: "Basic Variable 5",
    //   start: 100,
    // },
    // {
    //   active: true,
    //   amountToday: 240_000,
    //   btcWillingToSpend: 0.1,
    //   delay: 90,
    //   hash: "item-6",
    //   id: "item-6",
    //   name: "Basic Variable 6",
    //   start: 100,
    // },
    // {
    //   active: true,
    //   amountToday: 300_000,
    //   btcWillingToSpend: 0.1,
    //   delay: 0,
    //   hash: "item-7",
    //   id: "item-7",
    //   name: "Basic Variable 7",
    //   start: 0,
    // },
  ]);

  const innerCacheReference = useRef(
    new LRUCache<string, VariableDrawdownCache>({ max: 100 }),
  );
  const finalVariableCacheReference = useRef(
    new LRUCache<string, VariableDrawdownFinal>({ max: 10 }),
  );

  const value = useMemo(
    () =>
      ({
        bitcoin,
        drawdownData: drawdownData.current,
        finalVariableCache: finalVariableCacheReference.current,
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
        variableDrawdownCache: innerCacheReference.current,
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
