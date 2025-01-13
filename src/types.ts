// eslint-disable-next-line spaced-comment, @typescript-eslint/triple-slash-reference
/// <reference types="vite-plugin-svgr/client" />

import { type ChartDataset, type Point } from "chart.js";

import { distributions } from "./content";
import { type modelMap } from "./data/models";
import { type WalkTypes } from "./data/walks";

// eslint-disable-next-line functional/no-mixed-types

export interface ProviderProperties {
  children: React.ReactNode;
}

export interface MinMaxOptions {
  currentBlock: number;
  currentPrice: number;
  minMaxMultiple: number;
  now: number;
  variable: number;
  week: number;
}

// eslint-disable-next-line functional/no-mixed-types
export interface PriceModel<T extends string = string> {
  default: number;
  maxPrice: (options: MinMaxOptions) => number;
  minPrice: (options: MinMaxOptions) => number;
  modelType: T;
  rangeMax: number;
  rangeMin: number;
  varInput: string;
  varRange: boolean;
}

export interface BlockData {
  height: number;
  time: number;
}

export type HalvingData = Record<string, number>;

export interface HalvingFinder {
  currentBlock: number;
  halvings: HalvingData;
}

export interface NormalizePrice {
  maxArray: Float64Array;
  minArray: Float64Array;
  priceToNormalize: number;
  week: number;
}

export interface ApplyModel {
  maxArray: Float64Array;
  minArray: Float64Array;
  normalizedPrices: Float64Array;
  offset: number;
  week: number;
}

export type Dataset = ChartDataset<"line", Point[]>;

export type DatasetList = Dataset[];

export type PriceData = Float64Array[];

export type VolumeData = Float64Array[];

export interface Full {
  clampBottom: boolean;
  clampTop: boolean;
  minMaxMultiple: number;
  model: string;
  variable: number;
  volatility: number;
  walk: WalkTypes;
}

export interface Part {
  currentPrice: number;
  epochCount: number;
  logMaxArray: Float64Array;
  logMinArray: Float64Array;
  maxArray: Float64Array;
  minArray: Float64Array;
  samples: number;
  weeksSince: number;
}

export interface VolumeWorker {
  bitcoin: number;
  data: PriceData;
  inflation: number;
  now: number;
  oneOffFiatVariables: OneOffFiatVariable[];
  oneOffItems: OneOffItem[];
  reoccurringItems: ReoccurringItem[];
}

export interface VolumeReturn {
  average: number;
  median: number;
  volumeDataset: VolumeData;
  zero: number;
}
// eslint-disable-next-line functional/functional-parameters
export interface BitcoinDataPoint {
  close: number;
  conversionSymbol: string;
  conversionType: string;
  high: number;
  low: number;
  open: number;
  time: number;
  volumefrom: number;
  volumeto: number;
}

export type DataProperties = () => {
  datasets: Array<
    | {
        borderColor: string;
        borderWidth: number;
        data: Array<{
          x: number;
          y: number;
        }>;
        label: string;
        pointRadius: number;
        tension: number;
      }
    | Dataset
  >;
};

export interface RGBA {
  alpha?: number;
  blue: number;
  green: number;
  red: number;
}
export interface Pallet {
  solid: string;
  transparent: string;
}
export interface BaseColor {
  blue: number;
  green: number;
  red: number;
}
export interface DataSetParameters {
  color: BaseColor;
  cutoffs: number[];
  midLabel: string;
  quantiles: Point[][];
  type: "quantile" | "sd";
  yAxisID: "y" | "y1";
}

export interface BaseDrawdownItem {
  active: boolean;
  id: string;
  name: string;
}

export interface ReoccurringItem extends BaseDrawdownItem {
  annualAmount: number;
  annualPercentChange: number;
  effective: Date;
  end?: Date;
  expense: boolean;
  isFiat: boolean;
  // Consider adding a way to toggle weather or not to account for inflation "todaysValue"
}

export interface OneOffItem extends BaseDrawdownItem {
  amountToday: number;
  effective: Date;
  expense: boolean;
  isFiat: boolean;
  // Consider adding a way to toggle weather or not to account for inflation "todaysValue"
}

export interface OneOffFiatVariable extends BaseDrawdownItem {
  amountToday: number;
  btcWillingToSpend: number;
  delay: number;
  hash: string;
  start: number;
}

export type NarrowedOneOffFiat = Pick<
  OneOffFiatVariable,
  "amountToday" | "btcWillingToSpend" | "delay" | "hash" | "start"
>;

export type DrawdownItem = OneOffFiatVariable | OneOffItem | ReoccurringItem;

export type DistributionType = (typeof distributions)[number];

export const isValidDistribution = (
  value: string,
): value is DistributionType => {
  return distributions.includes(value as DistributionType);
};

// Placeholder components for type-specific fields
// eslint-disable-next-line functional/no-mixed-types
export interface FieldProperties<T extends DrawdownItem> {
  formData: Partial<T>;
  handleInputChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

export type DrawdownTypes =
  | "oneOffFiatVariable"
  | "oneOffItem"
  | "reoccurringItem";

export type FormData =
  | ({ type: "oneOffFiatVariable" } & BaseDrawdownItem & OneOffFiatVariable)
  | ({ type: "oneOffItem" } & BaseDrawdownItem & OneOffItem)
  | ({ type: "reoccurringItem" } & BaseDrawdownItem & ReoccurringItem);
// eslint-disable-next-line functional/no-mixed-types
export interface IModal {
  isOpen: boolean;
  item?: DrawdownItem;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (item: FormData) => void;
}

export type ModelNames = keyof typeof modelMap;

export interface SlideRequirement {
  bitcoin?: number;
  clampBottom?: boolean;
  clampTop?: boolean;
  epochCount?: number;
  hideResults?: boolean;
  inflation?: number;
  model?: ModelNames;
  oneOffFiatVariables?: OneOffFiatVariable[];
  oneOffItems?: OneOffItem[];
  renderDrawdownDistribution?: DistributionType;
  renderDrawdownWalks?: boolean;
  renderModelMax?: boolean;
  renderModelMin?: boolean;
  renderPriceDistribution?: DistributionType;
  renderPriceWalks?: boolean;
  reoccurringItems?: ReoccurringItem[];
  samples?: number;
  samplesToRender?: number;
  showDrawdown?: boolean;
  showModel?: boolean;
  showRender?: boolean;
  showResults?: boolean;
  volatility?: number;
  walk?: WalkTypes;
}

interface WalkOptions {
  clampBottom: boolean;
  clampTop: boolean;
  start: number;
  startWeek: number;
  volatility: number;
}
export type IWalk = (Options: WalkOptions) => Float64Array;
