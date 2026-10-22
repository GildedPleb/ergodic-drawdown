import { type ChartDataset, type Point } from "chart.js";

import { distributions } from "./content";
import type { modelMap } from "./data/models";
import type { WalkTypes } from "./data/walks";

export interface ProviderProperties {
  children: React.ReactNode;
}

export type ModelSettings = { readonly [key: string]: number | string };

/** One chart week plus the settings of the model pricing it. */
export interface PriceWeek {
  currentBlock: number;
  currentPrice: number;
  now: number;
  settings: ModelSettings;
  week: number;
}

/** One allowed value of a choice. `value` is what the model reads. */
interface ModelChoiceOption {
  label: string;
  value: string;
}

interface ModelNumberParam {
  default: number;
  key: string;
  kind: "number";
  label: string;
  max: number;
  min: number;
  step: number;
}

interface ModelChoiceParam {
  default: string;
  key: string;
  kind: "choice";
  label: string;
  options: readonly ModelChoiceOption[];
}

/** A declared setting. Another kind of control is another member of this union. */
export type ModelParam = ModelChoiceParam | ModelNumberParam;

export interface PriceModel<T extends string = string> {
  description: string;
  maxPrice: (week: PriceWeek) => number;
  minPrice: (week: PriceWeek) => number;
  name: T;
  params: readonly ModelParam[];
  summary: string;
}

export type HalvingData = Record<string, number>;

export interface HalvingFinder {
  currentBlock: number;
  halvings: HalvingData;
}

export type Dataset = ChartDataset<"line", Point[]>;

export type DatasetList = Dataset[];

export interface Full {
  clampBottom: boolean;
  clampTop: boolean;
  model: string;
  seed: number;
  settings: ModelSettings;
  volatility: number;
  walk: WalkTypes;
}

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

interface BaseDrawdownItem {
  active: boolean;
  id: string;
  name: string;
}

export interface ReoccurringItem extends BaseDrawdownItem {
  annualAmount: number;
  annualPercentChange: number;
  effective: Date;
  end?: Date | undefined;
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

export const isValidDistribution = (value: string): value is DistributionType => {
  for (const distribution of distributions) {
    if (distribution === value) return true;
  }
  return false;
};

export interface FieldChange {
  target: {
    checked?: boolean | undefined;
    name: string;
    type: string;
    value: string;
  };
}

export interface FieldProperties<T extends DrawdownItem> {
  formData: Partial<T>;
  handleInputChange: (event: FieldChange) => void;
}

export type DrawdownTypes = "oneOffFiatVariable" | "oneOffItem" | "reoccurringItem";

export type FormData =
  | ({ type: "oneOffFiatVariable" } & BaseDrawdownItem & OneOffFiatVariable)
  | ({ type: "oneOffItem" } & BaseDrawdownItem & OneOffItem)
  | ({ type: "reoccurringItem" } & BaseDrawdownItem & ReoccurringItem);
export interface IModal {
  isOpen: boolean;
  item?: DrawdownItem;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (item: FormData) => void;
}

export type ModelNames = keyof typeof modelMap;

export interface SavedAppState {
  bitcoin: number;
  clampBottom: boolean;
  clampTop: boolean;
  epochCount: number;
  hideResults: boolean;
  inflation: number;
  loadingPriceData: boolean;
  loadingVolumeData: boolean;
  minMaxMultiple: number;
  model: ModelNames;
  oneOffFiatVariables: OneOffFiatVariable[];
  oneOffItems: OneOffItem[];
  pinnedWeeks?: number;
  renderDrawdownDistribution: DistributionType;
  renderDrawdownWalks: boolean;
  renderModelMax: boolean;
  renderModelMin: boolean;
  renderPriceDistribution: DistributionType;
  renderPriceWalks: boolean;
  reoccurringItems: ReoccurringItem[];
  samples: number;
  samplesToRender: number | undefined;
  showDrawdown: boolean;
  showHistoric: boolean;
  showModel: boolean;
  showRender: boolean;
  showResults: boolean;
  variable: number;
  version: 1;
  volatility: number;
  walk: WalkTypes;
  years?: number;
}

export interface SlideRequirement {
  bitcoin?: number;
  clampBottom?: boolean;
  clampTop?: boolean;
  years?: number;
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
  random: () => number;
  start: number;
  startWeek: number;
  state: Float64Array;
  volatility: number;
}
export type IWalk = (options: WalkOptions) => Float64Array;
