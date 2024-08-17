import { useMemo } from "react";

import { MS_PER_WEEK } from "../../constants";
import { useRender } from "../../contexts/render";
import { useTime } from "../../contexts/time";
import { type DatasetList } from "../../types";
import { useMinArray } from "./min-array";

export const useMinModel = (): DatasetList => {
  const { renderModelMin } = useRender();
  const minArray = useMinArray();
  const now = useTime();

  return useMemo(() => {
    if (!renderModelMin) return [];
    const minPoints = [];
    let index = 0;
    for (const price of minArray) {
      minPoints.push({
        x: now + index * MS_PER_WEEK,
        y: price,
      });
      index++;
    }
    return [
      {
        borderColor: "green",
        borderWidth: 0.5,
        data: minPoints,
        label: `Model Min Value`,
        pointRadius: 0,
        tension: 0,
      },
    ];
  }, [renderModelMin, minArray, now]);
};
