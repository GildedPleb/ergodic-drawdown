import { useMemo } from "react";

import { MS_PER_WEEK } from "../../constants";
import { useComputedValues } from "../../contexts/computed";
import { useRender } from "../../contexts/render";
import { useTime } from "../../contexts/time";
import { type DatasetList } from "../../types";

export const useMaxModel = (): DatasetList => {
  const { renderModelMax } = useRender();
  const { maxArray } = useComputedValues();
  const now = useTime();

  return useMemo(() => {
    if (!renderModelMax || maxArray === null) return [];
    const maxPoints = [];
    let index = 0;
    for (const price of maxArray[0]) {
      maxPoints.push({
        x: now + index * MS_PER_WEEK,
        y: price,
      });
      index++;
    }
    return [
      {
        borderColor: "red",
        borderWidth: 0.5,
        data: maxPoints,
        label: `Model Max Value`,
        pointRadius: 0,
        tension: 0,
      },
    ] satisfies DatasetList;
  }, [renderModelMax, maxArray, now]);
};
