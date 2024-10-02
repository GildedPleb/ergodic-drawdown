import { useQuery } from "@tanstack/react-query";

import { useTime } from "../../contexts/time";
import { loadHalvings } from "../../helpers";
import { type HalvingFinder } from "../../types";
import { halvingFinder } from "./halving-finder";

const defaultHalving: HalvingFinder = {
  currentBlock: 0,
  halvings: loadHalvings(),
};

export const useHalvings = (): HalvingFinder => {
  const now = useTime();

  const { data = defaultHalving } = useQuery({
    placeholderData: defaultHalving,
    queryFn: async () => halvingFinder(now),
    queryKey: ["halving", now],
    staleTime: Infinity,
  });

  return data;
};
