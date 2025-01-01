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
  showHistoric: boolean,
  // eslint-disable-next-line max-params
): { datasets: DatasetList } => {
  // @ts-expect-error this works fine and is annoying to fix better
  return {
    datasets: [
      // @ts-expect-error this works fine and is annoying to fix better
      showHistoric ? marketDataset : {},
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
