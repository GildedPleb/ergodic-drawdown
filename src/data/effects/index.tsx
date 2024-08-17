import { useDrawdownNormal } from "./drawdown-normal";
import { useDrawdownQuantile } from "./drawdown-quantile";
import { usePriceNormal } from "./price-normal";
import { usePriceQuantile } from "./price-quantile";
import { useSimulation } from "./simulation";
import { useVolume } from "./volume";

export const useProcessing = (): void => {
  useSimulation();
  usePriceQuantile();
  usePriceNormal();
  useVolume();
  useDrawdownNormal();
  useDrawdownQuantile();
};
