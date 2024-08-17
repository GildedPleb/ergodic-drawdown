import { useMemo } from "react";

import { MS_PER_WEEK } from "../../constants";
import { useDrawdown } from "../../contexts/drawdown";
import { useRender } from "../../contexts/render";
import { useVolumeData } from "../../contexts/volume";
import { generateColor } from "../../helpers";
import { type DatasetList } from "../../types";

export const useDrawdownWalks = (): DatasetList => {
  const { samplesToRender } = useRender();
  const { volumeData } = useVolumeData();
  const { drawdownDate } = useDrawdown();
  const drawdownWalkDatasets: DatasetList = useMemo(
    () =>
      samplesToRender === undefined
        ? []
        : volumeData.slice(0, samplesToRender).map((graph, index) => ({
            borderColor: generateColor(index),
            borderWidth: 1,
            data: Array.from(graph, (point, innerIndex) => ({
              x: drawdownDate + innerIndex * MS_PER_WEEK,
              y: point,
            })),
            label: `BTC Amount (${index})`,
            pointRadius: 0,
            tension: 0,
            yAxisID: "y1",
          })),
    [samplesToRender, drawdownDate, volumeData],
  );
  return drawdownWalkDatasets;
};
