import { useLayoutEffect, type ReactNode } from "react";

import { useCurrentPrice } from "./contexts/computed/hooks/use-current-price";
import { useHalvings } from "./contexts/computed/hooks/use-halvings";
import { useInterimDataset } from "./contexts/computed/hooks/use-interim";
import { useDrawdown } from "./contexts/drawdown";
import { simulationSeed, useModel } from "./contexts/model";
import { useRender } from "./contexts/render";
import { useTime } from "./contexts/time";
import { useEngineSet } from "./hooks/use-engine";

const EngineBridge = ({ children }: { children: ReactNode }): ReactNode => {
  const set = useEngineSet();
  const {
    renderDrawdownDistribution,
    renderDrawdownWalks,
    renderModelMax,
    renderModelMin,
    renderPriceDistribution,
    renderPriceWalks,
    samplesToRender,
    showHistoric,
  } = useRender();
  const { currentBlock, halvings } = useHalvings();
  const interim = useInterimDataset();
  const {
    clampBottom,
    clampTop,
    epochCount,
    minMaxMultiple,
    model,
    samples,
    showModel,
    variable,
    volatility,
    walk,
  } = useModel();
  const currentPrice = useCurrentPrice();
  const now = useTime();
  const { bitcoin, inflation, oneOffFiatVariables, oneOffItems, reoccurringItems } = useDrawdown();

  useLayoutEffect(() => {
    set({
      currentBlock,
      currentPrice,
      epochs: epochCount,
      halvings,
      inflation: { annualPercent: inflation, mode: "constant" },
      interim,
      now,
      render: {
        renderDrawdownDistribution,
        renderDrawdownWalks,
        renderModelMax,
        renderModelMin,
        renderPriceDistribution,
        renderPriceWalks,
        samplesToRender,
        showHistoric,
      },
      samples,
      scenario: {
        clampBottom,
        clampTop,
        minMaxMultiple,
        model,
        oneOffFiatVariables,
        oneOffItems,
        reoccurringItems,
        showModel,
        variable,
        volatility,
        walk,
      },
      seed: simulationSeed,
      stack: { bitcoin },
    });
  }, [
    bitcoin,
    clampBottom,
    clampTop,
    currentBlock,
    currentPrice,
    epochCount,
    halvings,
    inflation,
    interim,
    minMaxMultiple,
    model,
    now,
    oneOffFiatVariables,
    oneOffItems,
    reoccurringItems,
    renderDrawdownDistribution,
    renderDrawdownWalks,
    renderModelMax,
    renderModelMin,
    renderPriceDistribution,
    renderPriceWalks,
    samples,
    samplesToRender,
    set,
    showHistoric,
    showModel,
    variable,
    volatility,
    walk,
  ]);

  return children;
};

export default EngineBridge;
