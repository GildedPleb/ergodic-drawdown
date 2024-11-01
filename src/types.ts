// eslint-disable-next-line spaced-comment, @typescript-eslint/triple-slash-reference
/// <reference types="vite-plugin-svgr/client" />

import { distributions } from "./content";

// eslint-disable-next-line functional/no-mixed-types

export interface ProviderProperties {
  children: React.ReactNode;
}

interface MinMaxOptions {
  currentBlock: number;
  currentPrice: number;
  minMaxMultiple: number;
  now: number;
  variable: number;
  week: number;
}

// eslint-disable-next-line functional/no-mixed-types
export interface PriceModel {
  default: number;
  maxPrice: (options: MinMaxOptions) => number;
  minPrice: (options: MinMaxOptions) => number;
  modelType: string;
  varInput: string;
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

export interface Point {
  x: number;
  y: number;
}

export interface Dataset {
  backgroundColor?: string;
  borderColor?: string;
  borderDash?: number[];
  borderWidth?: number;
  data: Point[];
  fill?: boolean | string;
  label: string;
  pointRadius: number;
  tension: number;
  yAxisID?: string;
}

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
  walk: string;
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

export type FormData = { type: string } & (
  | BaseDrawdownItem
  | OneOffFiatVariable
  | OneOffItem
  | ReoccurringItem
);

// eslint-disable-next-line functional/no-mixed-types
export interface IModal {
  isOpen: boolean;
  item?: DrawdownItem;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (item: FormData) => void;
}
