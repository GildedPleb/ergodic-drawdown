import { useMemo } from "react";

import { useModel } from "../../contexts/model";
import { useTime } from "../../contexts/time";
import { weeksSinceLastHalving } from "../../helpers";
import { modelMap } from "../models";
import useCurrentPrice from "./current-price";
import useHalvings from "./halvings";

const useMinArray = (): Float64Array => {
  const { currentBlock, halvings } = useHalvings();
  const { epochCount, minMaxMultiple, model, variable } = useModel();
  const currentPrice = useCurrentPrice();
  const now = useTime();

  return useMemo(() => {
    console.time("min");
    const lastHalving = weeksSinceLastHalving(halvings);
    const datasetLength = epochCount * 208 - lastHalving;
    const minPoints = new Float64Array(datasetLength);

    for (let index = 0; index < datasetLength; index++) {
      minPoints[index] = modelMap[model].minPrice({
        currentBlock,
        currentPrice,
        minMaxMultiple,
        now,
        variable,
        week: index,
      });
    }
    console.timeEnd("min");
    return minPoints;
  }, [
    currentBlock,
    currentPrice,
    epochCount,
    halvings,
    minMaxMultiple,
    model,
    now,
    variable,
  ]);
};

export default useMinArray;
