import { useQuery } from "@tanstack/react-query";

import { useTime } from "../../contexts/time";
import { loadHalvings } from "../../helpers";
import { type HalvingWorker } from "../../types";
import { halvingWorker } from "../workers/halving-worker";

const defaultHalving: HalvingWorker = {
  currentBlock: 0,
  halvings: loadHalvings(),
};

export const useHalvings = (): HalvingWorker => {
  const now = useTime();

  const { data = defaultHalving } = useQuery({
    placeholderData: defaultHalving,
    queryFn: async () => halvingWorker(now),
    queryKey: ["halving", now],
    staleTime: Infinity,
  });

  return data;
};
