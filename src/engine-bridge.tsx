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
    model,
    samples,
    settings,
    showModel,
    pinnedWeeks,
    volatility,
    walk,
    years,
  } = useModel();
  const currentPrice = useCurrentPrice();
  const now = useTime();
  const { bitcoin, inflation, oneOffFiatVariables, oneOffItems, reoccurringItems } = useDrawdown();

  useLayoutEffect(() => {
    set({
      currentBlock,
      currentPrice,
      halvings,
      inflation: { annualPercent: inflation, mode: "constant" },
      interim,
      now,
      pinnedWeeks,
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
        model,
        oneOffFiatVariables,
        oneOffItems,
        reoccurringItems,
        settings,
        showModel,
        volatility,
        walk,
      },
      seed: simulationSeed,
      stack: { bitcoin },
      years,
    });
  }, [
    bitcoin,
    clampBottom,
    clampTop,
    currentBlock,
    currentPrice,
    halvings,
    inflation,
    interim,
    model,
    now,
    oneOffFiatVariables,
    oneOffItems,
    pinnedWeeks,
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
    settings,
    showHistoric,
    showModel,
    volatility,
    walk,
    years,
  ]);

  return children;
};

export default EngineBridge;
