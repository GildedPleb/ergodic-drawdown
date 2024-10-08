import { bitcoinColor } from "../../content";
import { type BitcoinDataPoint, type Dataset } from "../../types";

export const handleInterimDataset = (
  _signal: AbortSignal,
  _hash: string,
  interim: BitcoinDataPoint[],
): Dataset => {
  return {
    borderColor: bitcoinColor,
    borderWidth: 0.5,
    data: interim.map((item) => ({
      x: item.time * 1000,
      y: item.close,
    })),
    label: `Bitcoin Historic Price`,
    pointRadius: 0,
    tension: 0,
  };
};
