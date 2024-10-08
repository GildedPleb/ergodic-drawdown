import { useMemo } from "react";

import { WEEKS_PER_EPOCH } from "../../constants";
import { useComputedValues } from "../../contexts/computed";
import { useModel } from "../../contexts/model";
import { getDataSetSize } from "./get-dataset-size";
export const useMemory = (): number => {
  const { dataProperties } = useComputedValues();

  const { epochCount, samples } = useModel();

  return useMemo(() => {
    return (
      // Model size * 2 === Model and Drawdown Data CONSIDER ADDING CACHE COUNTS
      (8 * WEEKS_PER_EPOCH * epochCount * samples * 2) / (1024 * 1024) +
      getDataSetSize(dataProperties?.datasets ?? [])
    );
  }, [dataProperties?.datasets, epochCount, samples]);
};
