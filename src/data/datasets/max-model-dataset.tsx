import { useMemo } from "react";

import { MS_PER_WEEK } from "../../constants";
import { useRender } from "../../contexts/render";
import { useTime } from "../../contexts/time";
import { type DatasetList } from "../../types";
import useMaxArray from "./max-array";

const useMaxModel = (): DatasetList => {
  const { renderModelMax } = useRender();
  const maxArray = useMaxArray();
  const now = useTime();

  return useMemo(() => {
    if (!renderModelMax) return [];
    const maxPoints = [];
    let index = 0;
    for (const price of maxArray) {
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

export default useMaxModel;
