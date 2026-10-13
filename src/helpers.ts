import { HALVING_INTERVAL, MS_PER_WEEK } from "./constants";
import { numberAt } from "./number-at";
import { type Task } from "./contexts/workers/types";
import { isModelName } from "./data/models";
import { isWalk } from "./data/walks";
import {
  type ApplyModel,
  type BaseColor,
  type DatasetList,
  type DataSetParameters,
  type DrawdownItem,
  type HalvingData,
  isValidDistribution,
  type NormalizePrice,
  type OneOffFiatVariable,
  type OneOffItem,
  type Pallet,
  type RGBA,
  type ReoccurringItem,
  type SavedAppState,
} from "./types";

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

const isHalvingData = (value: unknown): value is HalvingData => {
  if (typeof value !== "object" || value === null) return false;
  for (const entry of Object.values(value)) {
    if (typeof entry !== "number") return false;
  }
  return true;
};

export const loadHalvings = (): HalvingData => {
  const halvings = localStorage.getItem("halvings");
  if (halvings === null) return bakedHalvings;
  try {
    const parsed: unknown = JSON.parse(halvings);
    return isHalvingData(parsed) ? parsed : bakedHalvings;
  } catch {
    return bakedHalvings;
  }
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
  const min = numberAt(minArray, week);
  const max = numberAt(maxArray, week);

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
  for (const normalized of normalizedPrices) {
    const min = numberAt(minArray, index + week - offset);
    const max = numberAt(maxArray, index + week - offset);
    let price: number;
    if (normalized <= 0) {
      price = min * base ** normalized;
    } else if (normalized < 1) {
      const logMin = Math.log10(min);
      price = base ** (normalized * (Math.log10(max) - logMin) + logMin);
    } else {
      price = max * base ** (normalized - 1);
    }
    if (price < 0.01) price = 0.01;
    final[index] = price;
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

export const generateColor = (index: number, opacity = 1): string => {
  if (index === 0) return `rgba(246, 145, 50, ${opacity})`;
  let temporary = index;
  const random = (): number => seededRandom((temporary += 0x6d_2b_79_f5));
  const red = Math.floor(random() * 256);
  const green = Math.floor(random() * 256);
  const blue = Math.floor(random() * 256);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

export const quantile = (array: Float64Array | number[], percent: number): number => {
  if (array.length === 0) return 0;
  if (percent === 0) return numberAt(array, 0);
  if (percent === 1) return numberAt(array, array.length - 1);
  const id = array.length * percent - 1;
  if (id === Math.floor(id)) return (numberAt(array, id) + numberAt(array, id + 1)) / 2;
  return numberAt(array, Math.ceil(id));
};

export const timeout = async (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

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
    const series = quantiles[index];
    if (series === undefined) throw new Error(`missing quantile series ${index}`);
    return {
      ...(isSpecial
        ? { borderColor: colorPallet.solid, borderDash: [15, 5] }
        : { backgroundColor: colorPallet.transparent }),
      borderWidth: isSpecial ? 1 : 0,
      data: series,
      fill: isSpecial ? false : index < midIndex ? `+${midIndex - index}` : `-${index - midIndex}`,
      label: `${getLabel(cutoff, length, index, type)} ${midLabel}`,
      parsing: false,
      pointRadius: 0,
      tension: 0,
      yAxisID,
    };
  });
};

const divisor = (numb: number, max: number): number => {
  for (let index = max; index > 0; index--) if (numb % index === 0) return index;
  return 1;
};

const createTask = (arrayIndex: number, startIndex: number, endIndex: number): Task => ({
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

  const addTask = (ar: number, begin: number, end: number, size: number): void => {
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
    return `Starting ${item.effective.toLocaleDateString()}, ${item.expense ? "spend" : "acquire"} ${item.isFiat ? "$" : "₿"}${item.annualAmount.toLocaleString()}${item.isFiat ? " of bitcoin " : ""} every year${item.end === undefined ? "" : " until " + item.end.toLocaleDateString()}${item.annualPercentChange === 0 ? "" : ", changing by " + item.annualPercentChange + "% per year"}`;
  } else if ("amountToday" in item && !("btcWillingToSpend" in item)) {
    return `${item.expense ? "Spend" : "Acquire"} ${item.isFiat ? "$" : "₿"}${item.amountToday.toLocaleString()} ${item.isFiat ? "(in todays purchasing power)" : ""} on ${item.effective.toLocaleDateString()}`;
  } else if ("btcWillingToSpend" in item) {
    return `Spend ₿${item.btcWillingToSpend} on a $${item.amountToday.toLocaleString()} item, at least ${item.delay * 7} day(s) after ${item.start}% between the first affordable day, and last unaffordable day.`;
  }
  return "";
};

const generateKey = async (
  password: string,
  salt?: Uint8Array<ArrayBuffer>,
): Promise<{ key: CryptoKey; salt: Uint8Array<ArrayBuffer> }> => {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      hash: "SHA-256",
      iterations: 100_000,
      name: "PBKDF2",
      salt: saltBuffer,
    },
    keyMaterial,
    { length: 256, name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );
  return { key, salt: saltBuffer };
};

// Custom replacer function for JSON.stringify
const customReplacer = (_key: string, value: unknown): unknown => {
  return value;
};

const isSerializedDate = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
};
// Custom reviver function for JSON.parse
/**
 *
 * @param _key - stuff
 * @param value - stuff
 * @returns marshaled data
 */
function customReviver<T>(_key: string, value: T): Date | T {
  if (typeof value === "string" && isSerializedDate(value)) {
    return new Date(value);
  }
  return value;
}

export const encryptData = async (
  data: object,
  password: string,
): Promise<Uint8Array<ArrayBuffer>> => {
  const { key, salt } = await generateKey(password);
  const encoder = new TextEncoder();
  const stringified = JSON.stringify(data, customReplacer);
  const encodedData = encoder.encode(stringified);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await crypto.subtle.encrypt({ iv, name: "AES-GCM" }, key, encodedData);
  const encryptedContentArray = new Uint8Array(encryptedContent);
  const resultArray = new Uint8Array(salt.length + iv.length + encryptedContentArray.length);
  resultArray.set(salt, 0);
  resultArray.set(iv, salt.length);
  resultArray.set(encryptedContentArray, salt.length + iv.length);
  return resultArray;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const invalidSavedState = (): Error => new Error("saved state is not valid");

const readNumber = (record: Record<string, unknown>, field: string): number => {
  const value = record[field];
  if (typeof value !== "number") throw invalidSavedState();
  return value;
};

const readBoolean = (record: Record<string, unknown>, field: string): boolean => {
  const value = record[field];
  if (typeof value !== "boolean") throw invalidSavedState();
  return value;
};

const readModel = (record: Record<string, unknown>): SavedAppState["model"] => {
  const value = record["model"];
  if (typeof value !== "string" || !isModelName(value)) throw invalidSavedState();
  return value;
};

const readWalk = (record: Record<string, unknown>): SavedAppState["walk"] => {
  const value = record["walk"];
  if (typeof value !== "string" || !isWalk(value)) throw invalidSavedState();
  return value;
};

const readDistribution = (
  record: Record<string, unknown>,
  field: string,
): SavedAppState["renderPriceDistribution"] => {
  const value = record[field];
  if (typeof value !== "string" || !isValidDistribution(value)) throw invalidSavedState();
  return value;
};

const readSamplesToRender = (record: Record<string, unknown>): number | undefined => {
  const value = record["samplesToRender"];
  if (value === undefined) return undefined;
  if (typeof value !== "number") throw invalidSavedState();
  return value;
};

const isDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const isDrawdownBase = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  typeof value["active"] === "boolean" &&
  typeof value["id"] === "string" &&
  typeof value["name"] === "string";

const isOneOffFiatVariable = (value: unknown): value is OneOffFiatVariable =>
  isDrawdownBase(value) &&
  typeof value["amountToday"] === "number" &&
  typeof value["btcWillingToSpend"] === "number" &&
  typeof value["delay"] === "number" &&
  typeof value["hash"] === "string" &&
  typeof value["start"] === "number";

const isOneOffItem = (value: unknown): value is OneOffItem =>
  isDrawdownBase(value) &&
  typeof value["amountToday"] === "number" &&
  isDate(value["effective"]) &&
  typeof value["expense"] === "boolean" &&
  typeof value["isFiat"] === "boolean";

const isReoccurringItem = (value: unknown): value is ReoccurringItem => {
  if (!isDrawdownBase(value)) return false;
  const end = value["end"];
  return (
    typeof value["annualAmount"] === "number" &&
    typeof value["annualPercentChange"] === "number" &&
    isDate(value["effective"]) &&
    typeof value["expense"] === "boolean" &&
    typeof value["isFiat"] === "boolean" &&
    (end === undefined || isDate(end))
  );
};

const readItems = <T>(
  record: Record<string, unknown>,
  field: string,
  isItem: (value: unknown) => value is T,
): T[] => {
  const value = record[field];
  if (!Array.isArray(value) || !value.every((item) => isItem(item))) throw invalidSavedState();
  return value;
};

const readSavedAppState = (value: unknown): SavedAppState => {
  if (!isRecord(value) || value["version"] !== 1) throw invalidSavedState();
  return {
    bitcoin: readNumber(value, "bitcoin"),
    clampBottom: readBoolean(value, "clampBottom"),
    clampTop: readBoolean(value, "clampTop"),
    epochCount: readNumber(value, "epochCount"),
    hideResults: readBoolean(value, "hideResults"),
    inflation: readNumber(value, "inflation"),
    loadingPriceData: readBoolean(value, "loadingPriceData"),
    loadingVolumeData: readBoolean(value, "loadingVolumeData"),
    minMaxMultiple: readNumber(value, "minMaxMultiple"),
    model: readModel(value),
    oneOffFiatVariables: readItems(value, "oneOffFiatVariables", isOneOffFiatVariable),
    oneOffItems: readItems(value, "oneOffItems", isOneOffItem),
    renderDrawdownDistribution: readDistribution(value, "renderDrawdownDistribution"),
    renderDrawdownWalks: readBoolean(value, "renderDrawdownWalks"),
    renderModelMax: readBoolean(value, "renderModelMax"),
    renderModelMin: readBoolean(value, "renderModelMin"),
    renderPriceDistribution: readDistribution(value, "renderPriceDistribution"),
    renderPriceWalks: readBoolean(value, "renderPriceWalks"),
    reoccurringItems: readItems(value, "reoccurringItems", isReoccurringItem),
    samples: readNumber(value, "samples"),
    samplesToRender: readSamplesToRender(value),
    showDrawdown: readBoolean(value, "showDrawdown"),
    showHistoric: readBoolean(value, "showHistoric"),
    showModel: readBoolean(value, "showModel"),
    showRender: readBoolean(value, "showRender"),
    showResults: readBoolean(value, "showResults"),
    variable: readNumber(value, "variable"),
    version: 1,
    volatility: readNumber(value, "volatility"),
    walk: readWalk(value),
  };
};

export const decryptData = async (
  encryptedData: Uint8Array<ArrayBuffer>,
  password: string,
): Promise<SavedAppState> => {
  const salt = encryptedData.slice(0, 16);
  const iv = encryptedData.slice(16, 28);
  const data = encryptedData.slice(28);
  const { key } = await generateKey(password, salt);
  const decryptedContent = await crypto.subtle.decrypt({ iv, name: "AES-GCM" }, key, data);
  const decoder = new TextDecoder();
  const decoded = decoder.decode(decryptedContent);
  const parsed: unknown = JSON.parse(decoded, customReviver);
  return readSavedAppState(parsed);
};
