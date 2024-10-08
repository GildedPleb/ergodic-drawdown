import { marketDataset } from "../../data/datasets/historic";
import { type Dataset, type DatasetList } from "../../types";

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
  // eslint-disable-next-line max-params
): { datasets: DatasetList } => {
  return {
    datasets: [
      marketDataset,
      interimDataset,
      ...priceWalks,
      ...priceDistribution,
      ...minDataset,
      ...maxDataset,
      ...drawdownWalks,
      ...drawdownDistribution,
    ],
  } satisfies { datasets: DatasetList };
};
