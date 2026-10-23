import { MAX_EPOCH_COUNT, MAX_WEEKS } from "./constants";
import { MAX_YEAR_COUNT, resolveHorizon } from "./horizon";
import { numberAt } from "./number-at";
import { isModelName } from "./data/models";
import { isWalk } from "./data/walks";
import {
  type BaseColor,
  type DatasetList,
  type DataSetParameters,
  type DrawdownItem,
  isValidDistribution,
  type OneOffFiatVariable,
  type OneOffItem,
  type Pallet,
  type RGBA,
  type ModelSettings,
  type ReoccurringItem,
  type SavedAppState,
} from "./types";

export interface Task {
  arrayIndex: number;
  endIndex: number;
  startIndex: number;
}

const seededRandom = (seed: number): number => {
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

const getOrdinalSuffix = (amount: number): string => {
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

export const createTaskQueue = (
  totalSamplesNeeded: number,
  workerCount: number,
  samplesPerArray = 1024,
  startingSample = 0,
): Task[] => {
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

  if (startingSample !== 0) {
    const startingArray = Math.floor(startingSample / samplesPerArray);
    const startSample = startingSample % samplesPerArray;
    const additional = totalSamplesNeeded - startingSample;
    const endSample = Math.min(additional + startSample, samplesPerArray);
    const batchSize = Math.ceil((endSample - startSample) / workerCount);
    addTask(startingArray, startSample, endSample, batchSize);
    if (tasks.length < workerCount) saved = workerCount - tasks.length;
  }

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

  const remainingWork = totalSamplesNeeded - currentSample;
  if (remainingWork !== 0) {
    const workers = saved !== 0 && remainingWork < 45 ? saved : workerCount;
    const batchSize = Math.ceil(remainingWork / workers);
    addTask(currentArray, 0, remainingWork, batchSize);
  }
  return tasks;
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

// Identity. Dates stay ISO strings so customReviver can restore them.
const customReplacer = (_key: string, value: unknown): unknown => {
  return value;
};

const isSerializedDate = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
};
// Stored ISO timestamps parse back into Date.
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
  if (value === "Power Law Regression Median") return "Power Law";
  if (value === "Rainbow Chart") return "Rainbow";
  if (value === "Stock-To-Flow" || value === "Stock-To-Flow 2024 Refit") return "Stock-to-Flow";
  if (typeof value !== "string" || !isModelName(value)) throw invalidSavedState();
  return value;
};

const stockToFlowFormula = (
  record: Record<string, unknown>,
  settings: ModelSettings | undefined,
): ModelSettings | undefined => {
  if (record["model"] !== "Stock-To-Flow 2024 Refit") return settings;
  if (typeof settings?.["formula"] === "string") return settings;
  return { ...settings, formula: "2024" };
};

const readSettings = (record: Record<string, unknown>): ModelSettings | undefined => {
  const value = record["settings"];
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw invalidSavedState();
  const settings: { [key: string]: number | string } = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "number" && typeof item !== "string") throw invalidSavedState();
    settings[key] = item;
  }
  return settings;
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

const readBoundedInteger = (
  record: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
): number => {
  const value = readNumber(record, field);
  if (!Number.isInteger(value) || value < min || value > max) throw invalidSavedState();
  return value;
};

const readYears = (record: Record<string, unknown>): number | undefined => {
  if (record["years"] === undefined) return undefined;
  return readBoundedInteger(record, "years", 1, MAX_YEAR_COUNT);
};

const readPinnedWeeks = (record: Record<string, unknown>): number | undefined => {
  if (record["pinnedWeeks"] === undefined) return undefined;
  return readBoundedInteger(record, "pinnedWeeks", 1, MAX_WEEKS);
};

export const savedHorizon = (
  weeksSince: number,
  years: number,
  pinnedWeeks: number | null,
): { epochCount: number; pinnedWeeks?: number; years?: number } => {
  const epochCount = resolveHorizon(weeksSince, years, pinnedWeeks).epochs;
  if (pinnedWeeks === null) return { epochCount, years };
  return { epochCount, pinnedWeeks };
};

export const readSavedAppState = (value: unknown): SavedAppState => {
  if (!isRecord(value) || value["version"] !== 1) throw invalidSavedState();
  const pinnedWeeks = readPinnedWeeks(value);
  const settings = stockToFlowFormula(value, readSettings(value));
  const years = readYears(value);
  return {
    bitcoin: readNumber(value, "bitcoin"),
    clampBottom: readBoolean(value, "clampBottom"),
    clampTop: readBoolean(value, "clampTop"),
    epochCount: readBoundedInteger(value, "epochCount", 1, MAX_EPOCH_COUNT),
    hideResults: readBoolean(value, "hideResults"),
    inflation: readNumber(value, "inflation"),
    loadingPriceData: readBoolean(value, "loadingPriceData"),
    loadingVolumeData: readBoolean(value, "loadingVolumeData"),
    minMaxMultiple: readNumber(value, "minMaxMultiple"),
    model: readModel(value),
    oneOffFiatVariables: readItems(value, "oneOffFiatVariables", isOneOffFiatVariable),
    oneOffItems: readItems(value, "oneOffItems", isOneOffItem),
    ...(pinnedWeeks === undefined ? {} : { pinnedWeeks }),
    renderDrawdownDistribution: readDistribution(value, "renderDrawdownDistribution"),
    renderDrawdownWalks: readBoolean(value, "renderDrawdownWalks"),
    renderModelMax: readBoolean(value, "renderModelMax"),
    renderModelMin: readBoolean(value, "renderModelMin"),
    renderPriceDistribution: readDistribution(value, "renderPriceDistribution"),
    renderPriceWalks: readBoolean(value, "renderPriceWalks"),
    reoccurringItems: readItems(value, "reoccurringItems", isReoccurringItem),
    samples: readNumber(value, "samples"),
    samplesToRender: readSamplesToRender(value),
    ...(settings === undefined ? {} : { settings }),
    showDrawdown: readBoolean(value, "showDrawdown"),
    showHistoric: readBoolean(value, "showHistoric"),
    showModel: readBoolean(value, "showModel"),
    showRender: readBoolean(value, "showRender"),
    showResults: readBoolean(value, "showResults"),
    variable: readNumber(value, "variable"),
    version: 1,
    volatility: readNumber(value, "volatility"),
    walk: readWalk(value),
    ...(years === undefined ? {} : { years }),
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
