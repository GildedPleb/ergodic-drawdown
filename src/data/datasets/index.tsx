import { useMemo } from "react";

import { usePriceData } from "../../contexts/price";
import { useRender } from "../../contexts/render";
import { useVolumeData } from "../../contexts/volume";
import { type DataProperties, type DatasetList } from "../../types";
import { useCostOfLiving } from "./cost-of-living";
import { useDrawdownWalks } from "./drawdown-walks";
import { marketDataset } from "./historic";
import { useInterimDataset } from "./interim";
import { useMaxModel } from "./max-model-dataset";
import { useMinModel } from "./min-model-dataset";
import { usePriceWalkDataset } from "./price-walk";

export const useDataProperties: DataProperties = () => {
  const {
    renderDrawdownNormal,
    renderDrawdownQuantile,
    renderDrawdownWalks,
    renderExpenses,
    renderModelMax,
    renderModelMin,
    renderPriceNormal,
    renderPriceQuantile,
    renderPriceWalks,
  } = useRender();
  const interimDataset = useInterimDataset();
  const priceWalkDatasets = usePriceWalkDataset();
  const { priceNormal, priceQuantile } = usePriceData();
  const minModelDataset = useMinModel();
  const maxModelDataset = useMaxModel();
  const drawdownWalkDatasets = useDrawdownWalks();
  const { volumeNormal, volumeQuantile } = useVolumeData();
  const costOfLivingDataset = useCostOfLiving();

  return useMemo(
    () =>
      ({
        datasets: [
          marketDataset,
          interimDataset,
          ...(renderPriceWalks ? priceWalkDatasets : []),
          ...(renderPriceQuantile ? priceQuantile : []),
          ...(renderModelMin ? minModelDataset : []),
          ...(renderModelMax ? maxModelDataset : []),
          ...(renderDrawdownWalks ? drawdownWalkDatasets : []),
          ...(renderDrawdownQuantile ? volumeQuantile : []),
          ...(renderDrawdownNormal ? volumeNormal : []),
          ...(renderExpenses ? costOfLivingDataset : []),
          ...(renderPriceNormal ? priceNormal : []),
        ],
      }) satisfies { datasets: DatasetList },
    [
      interimDataset,
      renderPriceWalks,
      priceWalkDatasets,
      renderPriceQuantile,
      priceQuantile,
      renderModelMin,
      minModelDataset,
      renderModelMax,
      maxModelDataset,
      renderDrawdownWalks,
      drawdownWalkDatasets,
      renderDrawdownQuantile,
      volumeQuantile,
      renderDrawdownNormal,
      volumeNormal,
      renderExpenses,
      costOfLivingDataset,
      renderPriceNormal,
      priceNormal,
    ],
  );
};
