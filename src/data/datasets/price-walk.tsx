import { useMemo } from "react";

import { MS_PER_WEEK } from "../../constants";
import { useComputedValues } from "../../contexts/computed";
import { useRender } from "../../contexts/render";
import { useTime } from "../../contexts/time";
import { generateColor } from "../../helpers";
import { type DatasetList } from "../../types";

export const usePriceWalkDataset = (): DatasetList => {
  const { renderPriceWalks, samplesToRender } = useRender();
  const { priceData } = useComputedValues();
  const now = useTime();

  const priceWalkDatasets: DatasetList = useMemo(
    () =>
      samplesToRender === undefined || !renderPriceWalks || priceData === null
        ? []
        : priceData.slice(0, samplesToRender).map((graph, index) => ({
            borderColor: generateColor(index),
            borderWidth: 0.5,
            data: Array.from(graph, (point, innerIndex) => ({
              x: now + innerIndex * MS_PER_WEEK,
              y: point,
            })),
            label: `Potential Bitcoin Price (${index})`,
            pointRadius: 0,
            tension: 0,
          })),
    [samplesToRender, renderPriceWalks, priceData, now],
  );

  return priceWalkDatasets;
};
