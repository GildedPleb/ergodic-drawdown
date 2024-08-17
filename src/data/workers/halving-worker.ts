import { fetchBlockByHeight, getCurrentBlockHeight } from "../../api";
import { calculateHalvings, loadHalvings, saveHalvings } from "../../helpers";
import { type HalvingData, type HalvingWorker } from "../../types";

export const halvingWorker = async (now: number): Promise<HalvingWorker> => {
  console.time("halving");
  const currentBlockHeight = await getCurrentBlockHeight(now);
  const neededHalvings = calculateHalvings(currentBlockHeight);
  const storedHalvings = loadHalvings();
  const halvingsToFetch = neededHalvings.filter(
    (height) => !(height.toString() in storedHalvings),
  );
  if (halvingsToFetch.length === 0) {
    console.timeEnd("halving");
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
  console.timeEnd("halving");
  return { currentBlock: currentBlockHeight, halvings: knownHalvings };
};
