import { HALVING_INTERVAL, MS_PER_WEEK } from "./constants";
import { type Task } from "./contexts/workers/types";
import {
  type ApplyModel,
  type BaseColor,
  type DatasetList,
  type DataSetParameters,
  type DrawdownItem,
  type HalvingData,
  type NormalizePrice,
  type Pallet,
  type RGBA,
} from "./types";

// eslint-disable-next-line functional/functional-parameters
export const weeksSinceLastHalving = (
  dates: Record<number, number>,
): number => {
  const currentDate = new Date();
  let mostRecentHalvingDate = new Date(0);

  for (const [, timestamp] of Object.entries(dates)) {
    const halvingDate = new Date(timestamp * 1000);
    if (halvingDate <= currentDate && halvingDate > mostRecentHalvingDate) {
      mostRecentHalvingDate = halvingDate;
    }
  }

  const timeDifference =
    currentDate.getTime() - mostRecentHalvingDate.getTime();
  return Math.floor(timeDifference / MS_PER_WEEK);
};

export const calculateHalvings = (currentHeight: number): number[] => {
  const count = Math.floor(currentHeight / HALVING_INTERVAL);
  return Array.from(
    { length: count },
    (_, index) => (index + 1) * HALVING_INTERVAL,
  );
};

// eslint-disable-next-line functional/functional-parameters
export const loadHalvings = (): HalvingData => {
  const halvings = localStorage.getItem("halvings");
  return halvings === null
    ? {
        "210000": 1_354_116_278,
        "420000": 1_468_082_773,
        "630000": 1_589_225_023,
        "840000": 1_713_571_767,
      }
    : (JSON.parse(halvings) as HalvingData);
};

export const saveHalvings = (halvings: HalvingData): void => {
  localStorage.setItem("halvings", JSON.stringify(halvings));
};

const base = 10;

export const normalizePrice = ({
  maxArray,
  minArray,
  priceToNormalize,
  week,
}: NormalizePrice): number => {
  const min = minArray[week];
  const max = maxArray[week];

  if (priceToNormalize <= min) {
    return Math.log10(priceToNormalize / min);
  }
  if (priceToNormalize < max) {
    const logMin = Math.log10(min);
    return (Math.log10(priceToNormalize) - logMin) / (Math.log10(max) - logMin);
  }
  return Math.log10(priceToNormalize / max) + 1;
};

export const applyModel = ({
  maxArray,
  minArray,
  normalizedPrices,
  offset,
  week,
}: ApplyModel): Float64Array => {
  const final = new Float64Array(normalizedPrices.length);
  let index = 0;
  for (const price of normalizedPrices) {
    const min = minArray[index + week - offset];
    const max = maxArray[index + week - offset];
    if (price <= 0) {
      final[index] = min * base ** price;
    } else if (price < 1) {
      const logMin = Math.log10(min);
      final[index] = base ** (price * (Math.log10(max) - logMin) + logMin);
    } else {
      final[index] = max * base ** (price - 1);
    }
    if (final[index] < 0.01) final[index] = 0.01;
    index++;
  }
  return final;
};

export const seededRandom = (seed: number): number => {
  let t = seed + 0x6d_2b_79_f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};

export const generateColor = (index: number): string => {
  if (index === 0) return "rgb(246, 145, 50)";
  let temporary = index;
  // eslint-disable-next-line functional/functional-parameters
  const random = (): number => seededRandom((temporary += 0x6d_2b_79_f5));
  const red = Math.floor(random() * 256);
  const green = Math.floor(random() * 256);
  const blue = Math.floor(random() * 256);

  return `rgb(${red}, ${green}, ${blue})`;
};

export const quantile = (
  array: Float64Array | number[],
  percent: number,
): number => {
  if (array.length === 0) return 0;
  if (percent === 0) return array[0];
  if (percent === 1) return array.at(-1) ?? 0;
  const id = array.length * percent - 1;
  // eslint-disable-next-line security/detect-object-injection
  if (id === Math.floor(id)) return (array[id] + array[id + 1]) / 2;
  return array[Math.ceil(id)];
};

// eslint-disable-next-line functional/functional-parameters
export const timeout = async (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

export const getOrdinalSuffix = (amount: number): string => {
  const lastDigit = amount % 10;
  const lastTwoDigits = amount % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return "th";
  }

  switch (lastDigit) {
    case 1: {
      return "st";
    }
    case 2: {
      return "nd";
    }
    case 3: {
      return "rd";
    }
    default: {
      return "th";
    }
  }
};

// Function to convert a color code or rgb components to rgba string
const colorToRGBA = ({ alpha = 1, blue, green, red }: RGBA): string =>
  `rgba(${red}, ${green}, ${blue}, ${alpha})`;

const getColorVariants = ({ blue, green, red }: BaseColor): Pallet => {
  return {
    solid: colorToRGBA({ blue, green, red }),
    transparent: colorToRGBA({ alpha: 0.1, blue, green, red }),
  };
};

const getLabel = (
  cutoff: number,
  total: number,
  index: number,
  type: "quantile" | "sd",
): string => {
  if (index === Math.floor(total / 2)) return type === "sd" ? "Mean" : "Median";
  if (type === "quantile" && (index === 0 || index === total - 1)) {
    return index === 0 ? "Lowest Sampled" : "Highest Sampled";
  }
  const amount = type === "sd" ? Math.abs(cutoff) : Math.round(cutoff * 100);
  const suffix = getOrdinalSuffix(amount);
  return `${amount}${suffix} ${type === "sd" ? "Standard Deviation" : "Percentile"}`;
};

export const createDataSet = ({
  color,
  cutoffs,
  midLabel,
  quantiles,
  type,
  yAxisID,
}: DataSetParameters): DatasetList => {
  const length = cutoffs.length;
  const midIndex = Math.floor(length / 2);
  const colorPallet = getColorVariants(color);

  return cutoffs.map((cutoff, index) => {
    const isSpecial = index === midIndex;
    return {
      backgroundColor: isSpecial ? undefined : colorPallet.transparent,
      borderColor: isSpecial ? colorPallet.solid : undefined,
      borderDash: isSpecial ? [15, 5] : undefined,
      borderWidth: isSpecial ? 1 : 0,
      data: quantiles[index],
      fill: isSpecial
        ? false
        : index < midIndex
          ? `+${midIndex - index}`
          : `-${index - midIndex}`,
      label: `${getLabel(cutoff, length, index, type)} ${midLabel}`,
      pointRadius: 0,
      tension: 0,
      yAxisID,
    };
  });
};

const divisor = (numb: number, max: number): number => {
  for (let index = max; index > 0; index--)
    if (numb % index === 0) return index;
  return 1;
};

const createTask = (
  arrayIndex: number,
  startIndex: number,
  endIndex: number,
): Task => ({
  arrayIndex,
  endIndex,
  startIndex,
});

const MAX_SAMPLES = 10 * 1024;

// Function to create a task queue for distributing work among workers
export const createTaskQueue = (
  // Total number of samples required
  totalSamplesNeeded: number,
  // Number of available workers
  workerCount: number,
  // Number of samples per array (default: 1024)
  samplesPerArray = 1024,
  // Starting sample index (default: 0)
  startingSample = 0,
): Task[] => {
  // Input validation
  if (totalSamplesNeeded <= startingSample || workerCount === 0) return [];
  if (totalSamplesNeeded > MAX_SAMPLES)
    throw new Error(`Too many samples needed. Maximum allowed: ${MAX_SAMPLES}`);

  const tasks: Task[] = [];
  let currentSample = startingSample;
  let saved = 0;

  const addTask = (
    ar: number,
    begin: number,
    end: number,
    size: number,
  ): void => {
    for (let start = begin; start < end; start += size) {
      const finish = Math.min(start + size, end);
      tasks.push(createTask(ar, start, finish));
      currentSample += finish - start;
    }
  };

  // 1. Handle the starting array if we're not starting from the beginning
  if (startingSample !== 0) {
    const startingArray = Math.floor(startingSample / samplesPerArray);
    const startSample = startingSample % samplesPerArray;
    const additional = totalSamplesNeeded - startingSample;
    const endSample = Math.min(additional + startSample, samplesPerArray);
    const batchSize = Math.ceil((endSample - startSample) / workerCount);
    addTask(startingArray, startSample, endSample, batchSize);
    if (tasks.length < workerCount) saved = workerCount - tasks.length;
  }

  // 2. Handle full arrays
  let currentArray = Math.floor(currentSample / samplesPerArray);
  const remainingWorkMidway = totalSamplesNeeded - currentSample;
  const fullArraysNeeded = Math.floor(remainingWorkMidway / samplesPerArray);
  if (fullArraysNeeded >= 1) {
    const rounds = [];
    let remainingArrays = fullArraysNeeded;
    while (remainingArrays > 0) {
      const arraysForThisRound = divisor(workerCount, remainingArrays);
      const rawBatchSize = (arraysForThisRound * samplesPerArray) / workerCount;
      rounds.push({ arrayCount: arraysForThisRound, rawBatchSize });
      remainingArrays -= arraysForThisRound;
    }
    const startArray = currentArray;
    for (const { arrayCount, rawBatchSize } of rounds) {
      const batchSize = Math.ceil(rawBatchSize);
      for (let array = startArray; array < startArray + arrayCount; array++) {
        addTask(currentArray, 0, samplesPerArray, batchSize);
        currentArray++;
      }
    }
  }

  // 3. Handle leftovers (always 1 array)
  const remainingWork = totalSamplesNeeded - currentSample;
  if (remainingWork !== 0) {
    const workers = saved !== 0 && remainingWork < 45 ? saved : workerCount;
    const batchSize = Math.ceil(remainingWork / workers);
    addTask(currentArray, 0, remainingWork, batchSize);
  }
  return tasks;
};

export const findNextGreatest1000 = (x: number, y: number): number => {
  if (x > y) return x;
  if (x <= 0) return Math.min(1000, y);
  let nextThousand = Math.ceil(x / 1000) * 1000;
  if (x % 1000 === 0) nextThousand += 1000;
  return Math.min(nextThousand, y);
};

export const getItemDescription = (item: DrawdownItem): string => {
  if ("annualAmount" in item) {
    return `Starting ${item.effective.toLocaleDateString()}, ${item.expense ? "spend" : "acquire"} ${item.isFiat ? "$" : "₿"}${item.annualAmount.toLocaleString()} every year${item.end === undefined ? "" : " until " + item.end.toLocaleDateString()}${item.annualPercentChange === 0 ? "" : ", " + (item.annualPercentChange > 0 ? " increasing" : " decreasing") + " by " + item.annualPercentChange + "% per year"}`;
  } else if ("amountToday" in item && !("btcWillingToSpend" in item)) {
    return `${item.expense ? "Spend" : "Acquire"} ${item.isFiat ? "$" : "₿"}${item.amountToday.toLocaleString()} ${item.isFiat ? "(in todays purchasing power)" : ""} on ${item.effective.toLocaleDateString()}`;
  } else if ("btcWillingToSpend" in item) {
    return `Spend ₿${item.btcWillingToSpend} on a $${item.amountToday.toLocaleString()} item, at least ${item.delay * 7} day(s) after ${item.start}% between the first affordable day, and last unaffordable day.`;
  }
  return "";
};
