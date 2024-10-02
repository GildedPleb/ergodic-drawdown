import { type Full, type OneOffFiatVariable } from "../../types";

export type TaskStatus = "aborted" | "completed" | "pending";

export interface Task {
  arrayIndex: number;
  endIndex: number;
  startIndex: number;
}

export interface SupplementedTask extends Task {
  startEpoch?: number;
}

interface AbortEvent {
  type: "ABORT";
}

export interface RunSimulationEvent {
  payload: {
    currentPrice: number;
    epochCount: number;
    full: Full;
    logMaxArray: Float64Array;
    logMinArray: Float64Array;
    maxArray: Float64Array;
    minArray: Float64Array;
    samples: number;
    sharedBuffer: SharedArrayBuffer;
    task: SupplementedTask;
    weeksSince: number;
  };
  type: "RUN_PRICE_SIMULATION";
}

export interface RunVolumeEvent {
  payload: {
    bitcoin: number;
    epochCount: number;
    exportedVariableCache: {
      buffer: SharedArrayBuffer;
      sampleCount: number;
      weekCount: number;
    };
    priceBuffer: SharedArrayBuffer;
    task: Task;
    totalWeeklyBitcoinItems: Float64Array;
    totalWeeklyFiatItems: Float64Array;
    volumeBuffer: SharedArrayBuffer;
    weeksSince: number;
  };
  type: "RUN_VOLUME";
}

export interface RunDrawdownVariableEvent {
  payload: {
    epochCount: number;
    inflationFactors: Float64Array;
    oneOffFiatVariable: OneOffFiatVariable;
    priceDataBuffer: SharedArrayBuffer;
    task: Task;
    variableDrawdownBuffer: SharedArrayBuffer;
    weeksSince: number;
  };
  type: "RUN_DRAWDOWN_VARIABLE";
}

export interface DistributionGroupEvent {
  payload: {
    buffer: SharedArrayBuffer;
    dataLength: number;
    epochCount: number;
    getZero: boolean;
    groupedDataBuffer: SharedArrayBuffer;
    samples: number;
    task: Task;
    weeksSince: number;
  };
  type: "RUN_DISTRIBUTION_GROUP";
}

export interface DistributionQuantileEvent {
  payload: {
    cutoffs: number[];
    groupedDataBuffer: SharedArrayBuffer;
    quantilesBuffer: SharedArrayBuffer;
    samples: number;
    task: Task;
  };
  type: "RUN_DISTRIBUTION_QUANTILE";
}

export interface DistributionNormalEvent {
  payload: {
    cutoffs: number[];
    groupedDataBuffer: SharedArrayBuffer;
    quantilesBuffer: SharedArrayBuffer;
    samples: number;
    task: Task;
  };
  type: "RUN_DISTRIBUTION_NORMAL";
}

export type WorkerTasks =
  | DistributionGroupEvent
  | DistributionNormalEvent
  | DistributionQuantileEvent
  | RunDrawdownVariableEvent
  | RunSimulationEvent
  | RunVolumeEvent;

export interface QueueTask {
  data: AbortEvent | WorkerTasks;
  id: string;
  status: TaskStatus;
}

export interface WorkerEvent extends QueueTask {
  workerId: number;
}

export interface TaskResult {
  id: string;
  result?: unknown;
  status: TaskStatus;
}

export interface SignalState {
  aborted: boolean;
}
