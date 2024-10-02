import { useMemo } from "react";

import { MS_PER_WEEK } from "../../constants";
import { useComputedValues } from "../../contexts/computed";
import { useRender } from "../../contexts/render";
import { useTime } from "../../contexts/time";
import { generateColor } from "../../helpers";
import { type DatasetList } from "../../types";

export const useDrawdownWalks = (): DatasetList => {
  const { samplesToRender } = useRender();
  const { volume } = useComputedValues();
  const now = useTime();
  const drawdownWalkDatasets: DatasetList = useMemo(
    () =>
      samplesToRender === undefined || volume === null
        ? []
        : volume.slice(0, samplesToRender).map((graph, index) => ({
            borderColor: generateColor(index),
            borderWidth: 1,
            data: Array.from(graph, (point, innerIndex) => ({
              x: now + innerIndex * MS_PER_WEEK,
              y: point,
            })),
            label: `BTC Amount (${index})`,
            pointRadius: 0,
            tension: 0,
            yAxisID: "y1",
          })),
    [now, samplesToRender, volume],
  );
  return drawdownWalkDatasets;
};
