import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { fetchBlockByHeight, getCurrentBlockHeight } from "../../../api";
import {
  calculateHalvings,
  loadHalvings,
  saveHalvings,
} from "../../../helpers";
import { type HalvingData, type HalvingFinder } from "../../../types";
import { useTime } from "../../time";

const defaultHalving: HalvingFinder = {
  currentBlock: 0,
  halvings: loadHalvings(),
};

export const useHalvings = (): HalvingFinder => {
  const now = useTime();

  const halvingFinder = useCallback(async (): Promise<HalvingFinder> => {
    const currentBlockHeight = await getCurrentBlockHeight(now);
    const neededHalvings = calculateHalvings(currentBlockHeight);
    const storedHalvings = loadHalvings();
    const halvingsToFetch = neededHalvings.filter(
      (height) => !(height.toString() in storedHalvings),
    );
    if (halvingsToFetch.length === 0) {
      return {
        currentBlock: currentBlockHeight,
        halvings: storedHalvings,
      };
    }

    const fetchedHalvings: HalvingData = {};
    for await (const height of halvingsToFetch) {
      fetchedHalvings[height.toString()] = await fetchBlockByHeight(height);
      const knownHalvings = { ...storedHalvings, ...fetchedHalvings };
      saveHalvings(knownHalvings);
    }
    const knownHalvings = { ...storedHalvings, ...fetchedHalvings };
    saveHalvings(knownHalvings);
    return { currentBlock: currentBlockHeight, halvings: knownHalvings };
  }, [now]);

  const { data = defaultHalving } = useQuery({
    placeholderData: defaultHalving,
    queryFn: halvingFinder,
    queryKey: ["halving", now],
    staleTime: Infinity,
  });

  return data;
};
