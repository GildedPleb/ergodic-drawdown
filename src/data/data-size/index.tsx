import { useMemo } from "react";

import { useComputedValues } from "../../contexts/computed";
import { useDrawdownWalks } from "../datasets/drawdown-walks";
import { marketDataset } from "../datasets/historic";
import { useInterimDataset } from "../datasets/interim";
import { useMaxModel } from "../datasets/max-model-dataset";
import { useMinModel } from "../datasets/min-model-dataset";
import { usePriceWalkDataset } from "../datasets/price-walk";
import { getDataSize } from "./get-data-size";
import { getDataSetSize } from "./get-dataset-size";

export const useMemory = (): number => {
  const { priceData } = useComputedValues();
  const interimDataset = useInterimDataset();
  const priceWalkDatasets = usePriceWalkDataset();
  const { drawdownDistribution, priceDistribution, volume } =
    useComputedValues();
  const minModelDataset = useMinModel();
  const maxModelDataset = useMaxModel();
  const drawdownWalkDatasets = useDrawdownWalks();

  return useMemo(
    () =>
      getDataSize(priceData ?? []) * 2 +
      (volume === null ? 0 : getDataSize(volume)) +
      getDataSetSize([marketDataset]) +
      getDataSetSize([interimDataset]) +
      getDataSetSize(priceWalkDatasets) +
      (priceDistribution === null ? 0 : getDataSetSize(priceDistribution)) +
      getDataSetSize(minModelDataset) +
      getDataSetSize(maxModelDataset) +
      getDataSetSize(drawdownWalkDatasets) +
      (drawdownDistribution === null
        ? 0
        : getDataSetSize(drawdownDistribution)),

    [
      drawdownDistribution,
      drawdownWalkDatasets,
      interimDataset,
      maxModelDataset,
      minModelDataset,
      priceData,
      priceDistribution,
      priceWalkDatasets,
      volume,
    ],
  );
};
