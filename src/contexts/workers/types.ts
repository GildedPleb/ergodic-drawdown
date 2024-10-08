import { type ExportedState } from "../../classes/growable-shared-array";
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
    bufferState: ExportedState;
    currentPrice: number;
    epochCount: number;
    full: Full;
    maxArray: Float64Array[];
    minArray: Float64Array[];
    samples: number;
    task: SupplementedTask;
    weeksSince: number;
  };
  type: "RUN_PRICE_SIMULATION";
}

export interface RunVolumeEvent {
  payload: {
    bitcoin: number;
    drawdownExport: ExportedState;
    epochCount: number;
    exportedVariableCache: {
      buffer: SharedArrayBuffer;
      sampleCount: number;
      weekCount: number;
    };
    simulationExport: ExportedState;
    task: Task;
    totalWeeklyBitcoinItems: Float64Array;
    totalWeeklyFiatItems: Float64Array;
    weeksSince: number;
  };
  type: "RUN_VOLUME";
}

export interface RunDrawdownVariableEvent {
  payload: {
    inflationFactors: Float64Array;
    oneOffFiatVariable: OneOffFiatVariable;
    simulationExport: ExportedState;
    task: Task;
    variableDrawdownBuffer: SharedArrayBuffer;
    weeksSince: number;
  };
  type: "RUN_DRAWDOWN_VARIABLE";
}

export interface DistributionGroupEvent {
  payload: {
    buffer: ExportedState;
    dataLength: number;
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
