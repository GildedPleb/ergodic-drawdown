import { useRenderSimulation } from "./use-render-simulation";
import { useVolume } from "./use-volume";

export const useProcessing = (): void => {
  useVolume();
  useRenderSimulation();
};
