import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { MS_PER_DAY } from "../constants";
import { type ProviderProperties } from "../types";

// eslint-disable-next-line functional/no-mixed-types
type TimeContextType = number;

// eslint-disable-next-line unicorn/no-null
const TimeContext = createContext<TimeContextType | null>(null);

export const TimeProvider: React.FC<ProviderProperties> = ({ children }) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const daily = setInterval(() => {
      setNow(Date.now());
    }, MS_PER_DAY);
    return () => {
      clearInterval(daily);
    };
  }, []);

  const value = useMemo(() => now, [now]);

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
};

export const useTime = (): TimeContextType => {
  const context = useContext(TimeContext);
  if (context === null) {
    throw new Error("useTime must be used within a TimeProvider");
  }
  return context;
};
