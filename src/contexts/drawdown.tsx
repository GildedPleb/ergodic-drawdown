import { LRUCache } from "lru-cache";
import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import type VariableDrawdownCache from "../classes/variable-drawdown-cache";
import { type VariableDrawdownFinal } from "../classes/variable-drawdown-final";
import { MS_PER_YEAR } from "../constants";
import { loadHalvings } from "../helpers";
import {
  type OneOffFiatVariable,
  type OneOffItem,
  type ProviderProperties,
  type ReoccurringItem,
} from "../types"; // eslint-disable-next-line functional/no-mixed-types
interface DrawdownContextType {
  bitcoin: number;
  finalVariableCache: LRUCache<string, VariableDrawdownFinal>;
  inflation: number;
  oneOffFiatVariables: OneOffFiatVariable[];
  oneOffItems: OneOffItem[];
  reoccurringItems: ReoccurringItem[];
  setBitcoin: React.Dispatch<React.SetStateAction<number>>;
  setInflation: React.Dispatch<React.SetStateAction<number>>;
  setOneOffFiatVariables: React.Dispatch<
    React.SetStateAction<OneOffFiatVariable[]>
  >;
  setOneOffItems: React.Dispatch<React.SetStateAction<OneOffItem[]>>;
  setReoccurringItems: React.Dispatch<React.SetStateAction<ReoccurringItem[]>>;
  variableDrawdownCache: LRUCache<string, VariableDrawdownCache>;
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
  const [reoccurringItems, setReoccurringItems] = useState<ReoccurringItem[]>([
    // {
    //   active: false,
    //   annualAmount: 100_000,
    //   annualPercentChange: 0,
    //   effective: new Date(Date.now()),
    //   expense: true,
    //   id: "item-1",
    //   isFiat: true,
    //   name: "Live off Bitcoin",
    // },
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
    {
      active: true,
      amountToday: 250_000,
      btcWillingToSpend: 2,
      delay: 0,
      hash: "3ccbd62a",
      id: "item-0",
      name: "New Back House",
      start: 100,
    },
    // {
    //   active: true,
    //   amountToday: 20_000,
    //   btcWillingToSpend: 0.1,
    //   delay: 90,
    //   hash: "item-1",
    //   id: "item-1",
    //   name: "Basic Variable 1",
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
    new LRUCache<string, VariableDrawdownCache>({ max: 1 }),
  );
  const finalVariableCacheReference = useRef(
    new LRUCache<string, VariableDrawdownFinal>({ max: 10 }),
  );

  const value = useMemo(
    () =>
      ({
        bitcoin,
        finalVariableCache: finalVariableCacheReference.current,
        inflation,
        oneOffFiatVariables,
        oneOffItems,
        reoccurringItems,
        setBitcoin,
        setInflation,
        setOneOffFiatVariables,
        setOneOffItems,
        setReoccurringItems,
        variableDrawdownCache: innerCacheReference.current,
      }) satisfies DrawdownContextType,
    [bitcoin, inflation, oneOffFiatVariables, oneOffItems, reoccurringItems],
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
