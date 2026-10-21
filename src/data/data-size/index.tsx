import { useMemo } from "react";

import { WEEKS_PER_EPOCH } from "../../constants";
import { useEngineSelector } from "../../hooks/use-engine";
import { useModel } from "../../contexts/model";
import { getDataSetSize } from "./get-dataset-size";
export const useMemory = (): number => {
  const dataProperties = useEngineSelector((snapshot) => snapshot.dataProperties);
  const epochs = useEngineSelector((snapshot) => snapshot.epochs);
  const { samples } = useModel();

  return useMemo(() => {
    return (
      // Model size * 2 === Model and Drawdown Data CONSIDER ADDING CACHE COUNTS
      (8 * WEEKS_PER_EPOCH * epochs * samples * 2) / (1024 * 1024) +
      getDataSetSize(dataProperties?.datasets ?? [])
    );
  }, [dataProperties?.datasets, epochs, samples]);
};
