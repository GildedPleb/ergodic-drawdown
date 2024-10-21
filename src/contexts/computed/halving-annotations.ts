import { type LineAnnotationOptions } from "chartjs-plugin-annotation";

import { type HalvingData } from "../../types";

export const handleHalvingAnnotations = (
  _signal: AbortSignal,
  _hash: string,
  halvings: HalvingData,
): LineAnnotationOptions[] =>
  Object.entries(halvings).map(([, timestamp], index) => ({
    borderWidth: 0.5,
    color: "rgba(128, 128, 128, 0.5)",
    label: {
      backgroundColor: "transparent",
      color: "rgba(128, 128, 128, 0.5)",
      content: `Halving ${index + 1}`,
      display: true,
      font: {
        size: 12,
        weight: "bold",
      },
      position: "end",
      rotation: -90,
      xAdjust: -10,
      yAdjust: 0,
    },
    scaleID: "x",
    type: "line",
    value: timestamp * 1000,
  }));
