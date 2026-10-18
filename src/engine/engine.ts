import { weeksSinceLastHalving } from "../halvings";
import { type HalvingData } from "../types";
import { type WorkerContextType } from "../contexts/workers/types";
import { createGraph, type Graph } from "./graph-scheduler";
import { deriveKeys, sameConfig, type DerivedKeys, type EngineConfig } from "./keys";
import { EngineMemory } from "./memory";
import {
  attachNotes,
  createWorkerPool,
  resolvePoolCount,
  type TaskNote,
  type WorkerPool,
} from "./pool/worker-pool";
import { buildNodes, emptySlots, type ComputeEnv } from "./registry";
import { emptySnapshot, type Snapshot } from "./snapshot";

export interface Engine {
  readonly memory: EngineMemory;
  readonly workerCount: number;
  dispose(): void;
  get(): Snapshot;
  inputWaves(): number;
  notes(): readonly TaskNote[];
  runs(name: string): number;
  set(config: EngineConfig): void;
  settled(): Promise<"aborted" | "quiet">;
  subscribe(listener: () => void): () => void;
}

export interface EngineOptions {
  worker?: WorkerContextType;
  workers?: number;
}

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const createEngine = (options: EngineOptions = {}): Engine => {
  const memory = new EngineMemory();
  const notes: TaskNote[] = [];
  let pool: WorkerPool | null = null;
  let worker: WorkerContextType;
  if (options.worker !== undefined) {
    worker = attachNotes(options.worker, notes);
  } else {
    pool = createWorkerPool(resolvePoolCount(options.workers));
    worker = attachNotes(pool.worker, notes);
  }
  const workerCount = worker.count;
  const slots = emptySlots();
  const listeners = new Set<() => void>();
  const errors: Record<string, string> = {};
  let snapshot = emptySnapshot();
  let current: { config: EngineConfig; derived: DerivedKeys } | null = null;
  let stickyHalvings: HalvingData | null = null;
  let weeksSince = 0;
  let graph: Graph | null = null;

  const publish = (): void => {
    const dataLength = current?.derived.dataLength ?? 0;
    const next: Snapshot = {
      chartOptions: slots["Chart Options"],
      dataLength,
      dataProperties: slots["Data Properties"],
      errors: { ...errors },
      simulationStats: slots["Simulation Stats"],
      volumeStats: slots["Volume Statistics"],
      zeroCount: slots["Zero Count"],
    };
    const previous = snapshot;
    if (
      previous.chartOptions === next.chartOptions &&
      previous.dataLength === next.dataLength &&
      previous.dataProperties === next.dataProperties &&
      previous.simulationStats === next.simulationStats &&
      previous.volumeStats === next.volumeStats &&
      previous.zeroCount === next.zeroCount &&
      sameErrors(previous.errors, next.errors)
    ) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) listener();
  };

  const env: ComputeEnv = {
    get config() {
      if (current === null) throw new Error("engine has no config");
      return current.config;
    },
    get derived() {
      if (current === null) throw new Error("engine has no config");
      return current.derived;
    },
    hashOf: (name) => {
      if (graph === null) throw new Error("graph is not ready");
      return graph.currentHash(name);
    },
    memory,
    slots,
    worker,
  };

  graph = createGraph(buildNodes(env), {
    onChange: publish,
    onError: (name, error) => {
      errors[name] = errorText(error);
    },
    onPublished: (name) => {
      delete errors[name];
    },
  });

  const api: Engine = {
    dispose: () => {
      graph?.dispose();
      pool?.dispose();
    },
    get: () => snapshot,
    inputWaves: () => graph?.inputWaves() ?? 0,
    memory,
    notes: () => notes,
    runs: (name) => graph?.runs(name) ?? 0,
    set: (config) => {
      if (stickyHalvings !== config.halvings) {
        stickyHalvings = config.halvings;
        weeksSince = weeksSinceLastHalving(config.halvings);
      }
      if (
        current !== null &&
        sameConfig(current.config, config) &&
        current.derived.weeksSince === weeksSince
      ) {
        return;
      }
      current = { config, derived: deriveKeys(config, weeksSince) };
      publish();
      graph?.request();
    },
    settled: () => graph?.settled() ?? Promise.resolve("quiet"),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    workerCount,
  };
  return api;
};

const sameErrors = (
  left: Readonly<Record<string, string>>,
  right: Readonly<Record<string, string>>,
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (left[key] !== right[key]) return false;
  }
  return true;
};
