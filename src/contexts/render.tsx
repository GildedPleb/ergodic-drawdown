import React, { createContext, useContext, useMemo, useState } from "react";

import { isMobile } from "../constants";
import { type DistributionType, type ProviderProperties } from "../types";

// eslint-disable-next-line functional/no-mixed-types
export interface RenderContextType {
  hideResults: boolean;
  renderDrawdownDistribution: DistributionType;
  renderDrawdownWalks: boolean;
  renderModelMax: boolean;
  renderModelMin: boolean;
  renderPriceDistribution: DistributionType;
  renderPriceWalks: boolean;
  samplesToRender: number | undefined;
  setHideResults: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderDrawdownDistribution: React.Dispatch<
    React.SetStateAction<DistributionType>
  >;
  setRenderDrawdownWalks: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderModelMax: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderModelMin: React.Dispatch<React.SetStateAction<boolean>>;
  setRenderPriceDistribution: React.Dispatch<
    React.SetStateAction<DistributionType>
  >;
  setRenderPriceWalks: React.Dispatch<React.SetStateAction<boolean>>;
  setSamplesToRender: React.Dispatch<React.SetStateAction<number | undefined>>;
  setShowHistoric: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRender: React.Dispatch<React.SetStateAction<boolean>>;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  showHistoric: boolean;
  showRender: boolean;
  showResults: boolean;
}

// eslint-disable-next-line unicorn/no-null
const RenderContext = createContext<RenderContextType | null>(null);

export const RenderProvider: React.FC<ProviderProperties> = ({ children }) => {
  const [showRender, setShowRender] = useState<boolean>(false);
  const [renderPriceWalks, setRenderPriceWalks] = useState<boolean>(false);
  const [renderDrawdownWalks, setRenderDrawdownWalks] =
    useState<boolean>(false);
  const [renderModelMax, setRenderModelMax] = useState<boolean>(true);
  const [renderModelMin, setRenderModelMin] = useState<boolean>(true);
  const [samplesToRender, setSamplesToRender] = useState<number | undefined>(
    isMobile() ? 1 : 10,
  );
  const [renderPriceDistribution, setRenderPriceDistribution] =
    useState<DistributionType>("Quantile");
  const [renderDrawdownDistribution, setRenderDrawdownDistribution] =
    useState<DistributionType>("Quantile");
  const [showResults, setShowResults] = useState<boolean>(false);
  const [hideResults, setHideResults] = useState<boolean>(false);
  const [showHistoric, setShowHistoric] = useState<boolean>(true);

  const value = useMemo(
    () =>
      ({
        hideResults,
        renderDrawdownDistribution,
        renderDrawdownWalks,
        renderModelMax,
        renderModelMin,
        renderPriceDistribution,
        renderPriceWalks,
        samplesToRender,
        setHideResults,
        setRenderDrawdownDistribution,
        setRenderDrawdownWalks,
        setRenderModelMax,
        setRenderModelMin,
        setRenderPriceDistribution,
        setRenderPriceWalks,
        setSamplesToRender,
        setShowHistoric,
        setShowRender,
        setShowResults,
        showHistoric,
        showRender,
        showResults,
      }) satisfies RenderContextType,
    [
      hideResults,
      renderDrawdownDistribution,
      renderDrawdownWalks,
      renderModelMax,
      renderModelMin,
      renderPriceDistribution,
      renderPriceWalks,
      samplesToRender,
      showHistoric,
      showRender,
      showResults,
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
