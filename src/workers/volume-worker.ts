import hashSum from "hash-sum";

import { MS_PER_DAY, MS_PER_WEEK, WEEKS_PER_YEAR } from "../constants";
import { quantile, timeout } from "../helpers";
import { type Data, type VolumeReturn, type VolumeWorker } from "../types";

const signalState = { aborted: false };

const volumeWorker = async (
  { bitcoin, costOfLiving, data, drawdownDate, inflation }: VolumeWorker,
  signal: AbortSignal,
): Promise<[string, VolumeReturn | undefined]> => {
  const id = hashSum(Math.random());
  console.time("volume" + id);
  signalState.aborted = false;

  // eslint-disable-next-line functional/functional-parameters
  const AbortAction = (): void => {
    signal.removeEventListener("abort", AbortAction);
    console.warn("Aborted", id);
    signalState.aborted = true;
  };

  signal.addEventListener("abort", AbortAction);

  let zero = 0;
  const finalBalance: number[] = [];
  const now = Date.now();
  const adjustedDif = Math.floor(
    (drawdownDate + MS_PER_DAY - now) / MS_PER_WEEK,
  );
  const iterations =
    (data[0] ?? []).length - (drawdownDate - Date.now()) / MS_PER_WEEK;
  const startDistro = new Date(drawdownDate);
  const weeklyInflationRate = (1 + inflation / 100) ** (1 / WEEKS_PER_YEAR) - 1;

  const volumeDataset: Data = [];
  let index = 0;
  for (const graph of data) {
    if (index % 50 === 0) await timeout();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signalState.aborted) {
      console.timeEnd("volume" + id);
      return [id, undefined];
    } else {
      // console.log("loop volume");
    }
    let weeklyCostOfLiving = costOfLiving / WEEKS_PER_YEAR;
    let previous = bitcoin;
    const dataArray = [];

    for (let innerIndex = 0; innerIndex < iterations; innerIndex++) {
      const x = startDistro.getTime() + innerIndex * MS_PER_WEEK;
      if (previous <= 0) {
        dataArray.push({ x, y: 0 });
        continue;
      }
      const adjustedInnerIndex = innerIndex + adjustedDif;
      if (innerIndex !== 0) weeklyCostOfLiving *= 1 + weeklyInflationRate;
      // eslint-disable-next-line security/detect-object-injection
      const y = previous - weeklyCostOfLiving / graph[adjustedInnerIndex]?.y;
      previous = y;
      dataArray.push({ x, y });
    }

    const last = dataArray.at(-1);
    if (last !== undefined && last.y <= 0) zero += 1;
    if (last !== undefined) finalBalance.push(last.y);
    volumeDataset.push(dataArray);
    index++;
  }

  let sum = 0;
  for (const number of finalBalance) sum += number;
  const average = sum / finalBalance.length;

  const sortedValues = finalBalance.sort((first, second) => first - second);
  const middleQuant = quantile(sortedValues, 0.5);
  const median =
    middleQuant === 0 && volumeDataset[0].length === 0
      ? Number.NaN
      : middleQuant;
  const volumeReturn = { average, median, volumeDataset, zero };
  signal.removeEventListener("abort", AbortAction);
  console.timeEnd("volume" + id);
  return [id, volumeReturn];
};

export default volumeWorker;
