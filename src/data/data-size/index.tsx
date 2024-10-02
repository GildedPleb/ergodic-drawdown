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
  const { drawdownDistribution, priceData, priceDistribution } =
    useComputedValues();
  const interimDataset = useInterimDataset();
  const priceWalkDatasets = usePriceWalkDataset();
  const minModelDataset = useMinModel();
  const maxModelDataset = useMaxModel();
  const drawdownWalkDatasets = useDrawdownWalks();

  return useMemo(() => {
    return (
      // Model size * 2 === Model and Drawdown Data
      getDataSize(priceData ?? []) * 2 +
      getDataSetSize([marketDataset]) +
      getDataSetSize([interimDataset]) +
      getDataSetSize(minModelDataset) +
      getDataSetSize(maxModelDataset) +
      getDataSetSize(priceWalkDatasets) +
      getDataSetSize(drawdownWalkDatasets) +
      (priceDistribution === null ? 0 : getDataSetSize(priceDistribution)) +
      (drawdownDistribution === null ? 0 : getDataSetSize(drawdownDistribution))
    );
  }, [
    drawdownDistribution,
    drawdownWalkDatasets,
    interimDataset,
    maxModelDataset,
    minModelDataset,
    priceData,
    priceDistribution,
    priceWalkDatasets,
  ]);
};
