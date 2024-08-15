import React, { createContext, useContext, useMemo, useState } from "react";

import { isMobile } from "../constants";
import { type ProviderProperties } from "../types";

// eslint-disable-next-line functional/no-mixed-types
interface RenderContextType {
  renderDrawdownNormal: boolean;
  renderDrawdownQuantile: boolean;
  renderDrawdownWalks: boolean;
  renderExpenses: boolean;
  renderModelMax: boolean;
  renderModelMin: boolean;
  renderPriceNormal: boolean;
  renderPriceQuantile: boolean;
  renderPriceWalks: boolean;
  samplesToRender: number | undefined;
  setRenderDrawdownNormal: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderDrawdownQuantile: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderDrawdownWalks: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderExpenses: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderModelMax: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderModelMin: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderPriceNormal: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderPriceQuantile: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderPriceWalks: React.Dispatch<React.SetStateAction<boolean>>;
  setSamplesToRender: React.Dispatch<React.SetStateAction<number | undefined>>;
}

// eslint-disable-next-line unicorn/no-null
const RenderContext = createContext<RenderContextType | null>(null);

export const RenderProvider: React.FC<ProviderProperties> = ({ children }) => {
  const [renderPriceWalks, setRenderPriceWalks] = useState<boolean>(false);
  const [renderPriceQuantile, setRenderPriceQuantile] = useState<boolean>(true);
  const [renderPriceNormal, setRenderPriceNormal] = useState<boolean>(false);
  const [renderDrawdownWalks, setRenderDrawdownWalks] =
    useState<boolean>(false);
  const [renderDrawdownNormal, setRenderDrawdownNormal] =
    useState<boolean>(false);
  const [renderDrawdownQuantile, setRenderDrawdownQuantile] =
    useState<boolean>(true);
  const [renderExpenses, setRenderExpenses] = useState<boolean>(true);
  const [renderModelMax, setRenderModelMax] = useState<boolean>(true);
  const [renderModelMin, setRenderModelMin] = useState<boolean>(true);
  const [samplesToRender, setSamplesToRender] = useState<number | undefined>(
    isMobile() ? 1 : 10,
  );

  const value = useMemo(
    () => ({
      renderDrawdownNormal,
      renderDrawdownQuantile,
      renderDrawdownWalks,
      renderExpenses,
      renderModelMax,
      renderModelMin,
      renderPriceNormal,
      renderPriceQuantile,
      renderPriceWalks,
      samplesToRender,
      setRenderDrawdownNormal,
      setRenderDrawdownQuantile,
      setRenderDrawdownWalks,
      setRenderExpenses,
      setRenderModelMax,
      setRenderModelMin,
      setRenderPriceNormal,
      setRenderPriceQuantile,
      setRenderPriceWalks,
      setSamplesToRender,
    }),
    [
      renderDrawdownNormal,
      renderDrawdownQuantile,
      renderDrawdownWalks,
      renderExpenses,
      renderModelMax,
      renderModelMin,
      renderPriceNormal,
      renderPriceQuantile,
      renderPriceWalks,
      samplesToRender,
    ],
  );

  return (
    <RenderContext.Provider value={value}>{children}</RenderContext.Provider>
  );
};

export const useRender = (): RenderContextType => {
  const context = useContext(RenderContext);
  if (context === null) {
    throw new Error("useRender must be used within a RenderProvider");
  }
  return context;
};
