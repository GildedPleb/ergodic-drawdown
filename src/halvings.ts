import { HALVING_INTERVAL, MS_PER_WEEK } from "./constants";
import { type HalvingData } from "./types";

export const weeksSinceLastHalving = (dates: Record<number, number>): number => {
  const currentDate = new Date();
  let mostRecentHalvingDate = new Date(0);

  for (const [, timestamp] of Object.entries(dates)) {
    const halvingDate = new Date(timestamp * 1000);
    if (halvingDate <= currentDate && halvingDate > mostRecentHalvingDate) {
      mostRecentHalvingDate = halvingDate;
    }
  }

  const timeDifference = currentDate.getTime() - mostRecentHalvingDate.getTime();
  return Math.floor(timeDifference / MS_PER_WEEK);
};

export const calculateHalvings = (currentHeight: number): number[] => {
  const count = Math.floor(currentHeight / HALVING_INTERVAL);
  return Array.from({ length: count }, (_, index) => (index + 1) * HALVING_INTERVAL);
};

const bakedHalvings: HalvingData = {
  "210000": 1_354_116_278,
  "420000": 1_468_082_773,
  "630000": 1_589_225_023,
  "840000": 1_713_571_767,
};

const storedHalvingTimes = (value: unknown): HalvingData => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const times: HalvingData = {};
  for (const [height, time] of Object.entries(value)) {
    if (!/^[1-9]\d*$/.test(height)) continue;
    if (typeof time !== "number" || !Number.isFinite(time) || time <= 0) continue;
    times[height] = time;
  }
  return times;
};

export const loadHalvings = (): HalvingData => {
  const halvings = localStorage.getItem("halvings");
  if (halvings === null) return { ...bakedHalvings };
  try {
    const parsed: unknown = JSON.parse(halvings);
    // Baked times win. Storage only adds a halving this build does not know yet.
    return { ...storedHalvingTimes(parsed), ...bakedHalvings };
  } catch {
    return { ...bakedHalvings };
  }
};

export const saveHalvings = (halvings: HalvingData): void => {
  localStorage.setItem("halvings", JSON.stringify(halvings));
};
