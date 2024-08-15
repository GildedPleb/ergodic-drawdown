import { useMemo } from "react";

import { MS_PER_WEEK } from "../../constants";
import { usePriceData } from "../../contexts/price";
import { useRender } from "../../contexts/render";
import { useTime } from "../../contexts/time";
import { generateColor } from "../../helpers";
import { type DatasetList } from "../../types";

const usePriceWalkDataset = (): DatasetList => {
  const { renderPriceWalks, samplesToRender } = useRender();
  const { priceData } = usePriceData();
  const now = useTime();

  const priceWalkDatasets: DatasetList = useMemo(
    () =>
      samplesToRender === undefined || !renderPriceWalks
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

export default usePriceWalkDataset;
