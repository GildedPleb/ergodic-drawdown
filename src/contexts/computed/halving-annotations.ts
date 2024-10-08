import { type HalvingData } from "../../types";

export const handleHalvingAnnotations = (
  _signal: AbortSignal,
  _hash: string,
  halvings: HalvingData,
): Array<Record<string, number | object | string>> =>
  Object.entries(halvings).map(([, timestamp], index) => ({
    borderWidth: 0.5,
    label: {
      content: `Halving ${index + 1}`,
      position: "center",
    },
    scaleID: "x",
    type: "line",
    value: timestamp * 1000,
  }));
