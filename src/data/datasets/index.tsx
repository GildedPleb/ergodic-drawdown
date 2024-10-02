import { useEffect, useMemo, useState } from "react";

import { useComputedValues } from "../../contexts/computed";
import { useRender } from "../../contexts/render";
import { type DataProperties, type DatasetList } from "../../types";
import { useDrawdownWalks } from "./drawdown-walks";
import { marketDataset } from "./historic";
import { useInterimDataset } from "./interim";
import { useMaxModel } from "./max-model-dataset";
import { useMinModel } from "./min-model-dataset";
import { usePriceWalkDataset } from "./price-walk";

export const useDataProperties: DataProperties = () => {
  const {
    renderDrawdownDistribution,
    renderDrawdownWalks,
    renderModelMax,
    renderModelMin,
    renderPriceDistribution,
    renderPriceWalks,
  } = useRender();
  const interimDataset = useInterimDataset();
  const priceWalkDatasets = usePriceWalkDataset();
  const minModelDataset = useMinModel();
  const maxModelDataset = useMaxModel();
  const drawdownWalkDatasets = useDrawdownWalks();
  const { drawdownDistribution, priceDistribution } = useComputedValues();

  const [previousPriceDistribution, setPreviousPriceDistribution] =
    useState<DatasetList>([]);
  const [previousDrawdownDistribution, setPreviousDrawdownDistribution] =
    useState<DatasetList>([]);

  // Update previous data when new data is available
  useEffect(() => {
    if (priceDistribution !== null) {
      setPreviousPriceDistribution(priceDistribution);
    }
  }, [priceDistribution]);

  useEffect(() => {
    if (drawdownDistribution !== null) {
      setPreviousDrawdownDistribution(drawdownDistribution);
    }
  }, [drawdownDistribution]);

  return useMemo(
    () =>
      ({
        datasets: [
          marketDataset,
          interimDataset,
          ...(renderPriceWalks ? priceWalkDatasets : []),
          ...(renderPriceDistribution === "None"
            ? []
            : previousPriceDistribution),
          ...(renderModelMin ? minModelDataset : []),
          ...(renderModelMax ? maxModelDataset : []),
          ...(renderDrawdownWalks ? drawdownWalkDatasets : []),
          ...(renderDrawdownDistribution === "None"
            ? []
            : previousDrawdownDistribution),
        ],
      }) satisfies { datasets: DatasetList },
    [
      interimDataset,
      renderPriceWalks,
      priceWalkDatasets,
      renderPriceDistribution,
      previousPriceDistribution,
      renderModelMin,
      minModelDataset,
      renderModelMax,
      maxModelDataset,
      renderDrawdownWalks,
      drawdownWalkDatasets,
      renderDrawdownDistribution,
      previousDrawdownDistribution,
    ],
  );
};
