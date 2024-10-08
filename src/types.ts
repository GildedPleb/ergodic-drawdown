// eslint-disable-next-line spaced-comment, @typescript-eslint/triple-slash-reference
/// <reference types="vite-plugin-svgr/client" />

// eslint-disable-next-line functional/no-mixed-types

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

export interface HalvingWorker {
  currentBlock: number;
  halvings: HalvingData;
}

export interface NormalizePrice {
  currentBlock: number;
  currentPrice: number;
  minMaxMultiple: number;
  model: PriceModel;
  now: number;
  priceToNormalize: number;
  variable: number;
  week?: number;
}

export interface ApplyModel {
  currentBlock: number;
  currentPrice: number;
  minMaxMultiple: number;
  model: PriceModel;
  normalizedPrices: number[];
  now: number;
  startIndex?: number;
  variable: number;
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
  now: number;
  variable: number;
  volatility: number;
  walk: string;
}

export interface Part {
  currentBlock: number;
  currentPrice: number;
  epochCount: number;
  halvings: HalvingData;
  samples: number;
}
export interface SimulationWorker {
  clampBottom: boolean;
  clampTop: boolean;
  currentBlock: number;
  currentPrice: number;
  epochCount: number;
  full: Full;
  halvings: Record<number, number>;
  minMaxMultiple: number;
  model: string;
  now: number;
  part: Part;
  samples: number;
  variable: number;
  volatility: number;
  walk: string;
}

export interface VolumeWorker {
  bitcoin: number;
  costOfLiving: number;
  data: PriceData;
  drawdownDate: number;
  inflation: number;
  now: number;
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
