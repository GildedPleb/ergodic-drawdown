import { type Point } from "chart.js";

import { marketDataset } from "../../data/datasets/historic";
import { type Dataset, type DatasetList } from "../../types";

const emptyDataset = { data: [] as Point[] } satisfies Dataset;

export const handleDataProperties = (
  _signal: AbortSignal,
  _hash: string,
  drawdownDistribution: DatasetList,
  drawdownWalks: DatasetList,
  interimDataset: Dataset,
  maxDataset: DatasetList,
  minDataset: DatasetList,
  priceDistribution: DatasetList,
  priceWalks: DatasetList,
  showHistoric: boolean,
  // eslint-disable-next-line max-params
): { datasets: DatasetList } => {
  return {
    datasets: [
      showHistoric ? marketDataset : emptyDataset,
      interimDataset,
      ...minDataset,
      ...maxDataset,
      ...priceWalks,
      ...priceDistribution,
      ...drawdownWalks,
      ...drawdownDistribution,
    ],
  } satisfies { datasets: DatasetList };
};
