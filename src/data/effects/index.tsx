import { useDrawdownLoaded } from "./use-drawdown-loaded";
import { useSimulationLoaded } from "./use-simulation-loaded";

export const useProcessing = (): void => {
  useDrawdownLoaded();
  useSimulationLoaded();
};
