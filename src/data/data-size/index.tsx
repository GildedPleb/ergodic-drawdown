import { useMemo } from "react";

import { usePriceData } from "../../contexts/price";
import { useVolumeData } from "../../contexts/volume";
import { useCostOfLiving } from "../datasets/cost-of-living";
import { useDrawdownWalks } from "../datasets/drawdown-walks";
import { marketDataset } from "../datasets/historic";
import { useInterimDataset } from "../datasets/interim";
import { useMaxModel } from "../datasets/max-model-dataset";
import { useMinModel } from "../datasets/min-model-dataset";
import { usePriceWalkDataset } from "../datasets/price-walk";
import { getDataSize } from "./get-data-size";
import { getDataSetSize } from "./get-dataset-size";

export const useMemory = (): number => {
  const { priceData } = usePriceData();
  const { volumeData } = useVolumeData();
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
      getDataSize(priceData) * 2 +
      getDataSize(volumeData) +
      getDataSetSize([marketDataset]) +
      getDataSetSize([interimDataset]) +
      getDataSetSize(priceWalkDatasets) +
      getDataSetSize(priceQuantile) +
      getDataSetSize(minModelDataset) +
      getDataSetSize(maxModelDataset) +
      getDataSetSize(drawdownWalkDatasets) +
      getDataSetSize(volumeQuantile) +
      getDataSetSize(volumeNormal) +
      getDataSetSize(costOfLivingDataset) +
      getDataSetSize(priceNormal),
    [
      costOfLivingDataset,
      drawdownWalkDatasets,
      interimDataset,
      maxModelDataset,
      minModelDataset,
      priceData,
      priceNormal,
      priceQuantile,
      priceWalkDatasets,
      volumeData,
      volumeNormal,
      volumeQuantile,
    ],
  );
};
