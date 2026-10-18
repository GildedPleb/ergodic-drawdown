import { type ChartOptions } from "chart.js";

import { type DatasetList } from "../types";

export interface Snapshot {
  chartOptions: ChartOptions<"line"> | null;
  dataLength: number;
  dataProperties: { datasets: DatasetList } | null;
  errors: Readonly<Record<string, string>>;
  simulationStats: { average: number; median: number } | null;
  volumeStats: { average: number; median: number } | null;
  zeroCount: { finalBalance: Float64Array; zero: number } | null;
}

export const emptySnapshot = (): Snapshot => ({
  chartOptions: null,
  dataLength: 0,
  dataProperties: null,
  errors: {},
  simulationStats: null,
  volumeStats: null,
  zeroCount: null,
});
