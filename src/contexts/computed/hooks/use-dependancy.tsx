import { type ChartOptions, type Point } from "chart.js";
import { type LineAnnotationOptions } from "chartjs-plugin-annotation";
import hashSum from "hash-sum";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import GrowableSharedArray from "../../../classes/growable-shared-array";
import type VariableDrawdownCache from "../../../classes/variable-drawdown-cache";
import { type VariableDrawdownFinal } from "../../../classes/variable-drawdown-final";
import {
  type BitcoinDataPoint,
  type Dataset,
  type DatasetList,
  type Full,
  type HalvingData,
  type NarrowedOneOffFiat,
  type OneOffItem,
  type ReoccurringItem,
} from "../../../types";
import { type WorkerContextType } from "../../workers";
import { type TaskResult, type WorkerTasks } from "../../workers/types";
import { type DrawdownStaticReturn } from "../drawdown-static";
import { type FiatVariableLabel } from "../drawdown-variable-labels";

const dependencyObjectSymbol = Symbol("DependencyObject");

const WAVE_QUIET_MS = 100;
const waveSteps: { ms: number; name: string }[] = [];
let waveTimer: ReturnType<typeof setTimeout> | undefined;

const tenth = (ms: number): string => (Math.round(ms * 10) / 10).toFixed(1);

const flushWave = (): void => {
  waveTimer = undefined;
  const steps = waveSteps.splice(0);
  const slow = steps.filter((step) => step.ms >= 0.1).toSorted((left, right) => right.ms - left.ms);
  const quiet = steps.length - slow.length;
  const parts = slow.map((step) => `${step.name} ${tenth(step.ms)}ms`);
  if (quiet > 0) parts.push(`${quiet} under 0.1ms`);
  if (parts.length > 0) console.log(parts.join(" · "));
};

const recordStep = (name: string, ms: number): void => {
  waveSteps.push({ ms, name });
  if (waveTimer !== undefined) clearTimeout(waveTimer);
  waveTimer = setTimeout(flushWave, WAVE_QUIET_MS);
};

type PrimitiveDependency =
  | ((abortId: string) => void)
  | ((tasks: WorkerTasks[]) => Promise<TaskResult[]>)
  | {
      finalBalance: Float64Array;
      zero: number;
    }
  | FiatVariableLabel[]
  | BitcoinDataPoint[]
  | ChartOptions<"line">
  | Dataset
  | DatasetList
  | DrawdownStaticReturn
  | Float64Array
  | Float64Array[]
  | Full
  | GrowableSharedArray
  | HalvingData
  | Map<string, VariableDrawdownCache>
  | Map<string, VariableDrawdownFinal>
  | LineAnnotationOptions[]
  | NarrowedOneOffFiat[]
  | OneOffItem[]
  | ReoccurringItem[]
  | WorkerContextType
  | boolean
  | number
  | string
  | undefined;

type Dependency<R> = DependencyObject<R> | PrimitiveDependency;

type ComputeFunction<T extends PrimitiveDependency[], R> = (
  signal: AbortSignal,
  hash: string,
  ...arguments_: T
) => Promise<R> | R;

interface DependencyObjectBase {
  currentHash: string;
  [dependencyObjectSymbol]: true;
  lastComputed: string;
  name: string;
  waitingOn: string[];
}

interface DependencyObjectLoading extends DependencyObjectBase {
  result: null;
}

interface DependencyObjectLoaded<R> extends DependencyObjectBase {
  result: R;
}

export type DependencyObject<R> = DependencyObjectLoaded<R> | DependencyObjectLoading;

function assertDependencyLoaded<R>(
  dep: DependencyObject<R>,
): asserts dep is DependencyObjectLoaded<R> {
  if (dep.result === null) {
    return;
  }
}

export function narrow<R>(dep: DependencyObject<R>): R {
  assertDependencyLoaded(dep);
  return dep.result;
}

function isDependencyObject<R>(dep: unknown): dep is DependencyObject<R> {
  return Boolean(dep) && typeof dep === "object" && dep !== null && dependencyObjectSymbol in dep;
}

function isDatasetOrDatasetList(object: unknown): boolean {
  if (Array.isArray(object)) {
    if (object.length > 0 && isDataset(object[0])) {
      return true;
    }
  } else if (typeof object === "object" && object !== null && isDataset(object)) {
    return true;
  }
  return false;
}

function isDataset(object: unknown): object is Dataset {
  return (
    typeof object === "object" &&
    object !== null &&
    "data" in object &&
    Array.isArray(object.data) &&
    isPoint(object.data[0]) &&
    "label" in object &&
    typeof object.label === "string" &&
    "pointRadius" in object &&
    typeof object.pointRadius === "number" &&
    "tension" in object &&
    typeof object.tension === "number"
  );
}

function isPoint(point: unknown): point is Point {
  return (
    typeof point === "object" &&
    point !== null &&
    "x" in point &&
    typeof point.x === "number" &&
    "y" in point &&
    typeof point.y === "number"
  );
}

const fastCustomHashSum = (dependencies: readonly Dependency<unknown>[]): string => {
  const length = dependencies.length;
  const parts: string[] = Array.from({ length });
  for (let index = 0; index < length; index++) {
    const dep = dependencies[index];

    if (dep instanceof GrowableSharedArray) {
      parts[index] = "GrowableSharedArray";
    } else if (dep instanceof Float64Array) {
      parts[index] = "Float64Array";
    } else if (Array.isArray(dep) && dep.some((item) => item instanceof Float64Array)) {
      parts[index] = "Float64Array[]";
    } else if (dep instanceof Map) {
      parts[index] = "Map";
    } else if (isDependencyObject(dep)) {
      parts[index] = dep.currentHash;
    } else if (typeof dep === "function") {
      parts[index] = "function";
    } else if (typeof dep === "object" && dep !== null) {
      if (isDatasetOrDatasetList(dep)) {
        parts[index] = "Dataset";
      } else {
        const objectParts: string[] = [];
        for (const [key, value] of Object.entries(dep)) {
          if (value instanceof Float64Array) {
            objectParts.push(`${key}:Float64Array`);
          } else if (typeof value === "object" && value !== null) {
            objectParts.push(`${key}:${hashSum(value)}`);
          } else {
            objectParts.push(`${key}:${String(value)}`);
          }
        }
        parts[index] = objectParts.join(",");
      }
    } else {
      parts[index] = String(dep);
    }
  }

  const toHash = parts.join("|");
  return hashSum(toHash);
};

export const useDependency = <T extends PrimitiveDependency[], R>(
  name: string,
  computeFunction: ComputeFunction<T, R>,
  inputs: [...T],
  watched: readonly Dependency<unknown>[] = [],
  clearResults = true,
): DependencyObject<R> => {
  // A repeated result is Object.is-equal, so completion has to be its own state.
  // A ref would update lastComputed without a render, and the next layer would wait forever.
  const [published, setPublished] = useState<{ lastComputed: string; result: R | null }>({
    lastComputed: "",
    result: null,
  });

  const abortControllerReference = useRef<AbortController | null>(null);
  const computingHashReference = useRef<null | string>(null);
  const latestComputeRequestReference = useRef<null | symbol>(null);
  const waitingOn = useRef<string[]>([]);

  const dependencies = useMemo(() => [...inputs, ...watched], [inputs, watched]);
  const currentHash = fastCustomHashSum(dependencies);

  const compute = useCallback(
    async (hash: string): Promise<void> => {
      const computeRequest = Symbol("computeRequest");
      latestComputeRequestReference.current = computeRequest;
      abortControllerReference.current = new AbortController();
      const { signal } = abortControllerReference.current;

      const isLatestRequest = (): boolean =>
        latestComputeRequestReference.current === computeRequest;

      const started = performance.now();
      try {
        const computedResult = await computeFunction(signal, hash, ...inputs);

        if (!signal.aborted && isLatestRequest()) {
          setPublished({ lastComputed: currentHash, result: computedResult });
        } else {
          console.log(
            name,
            `Compute ended for ${hash} ${signal.aborted ? "on abort." : "on invalid compute."}`,
          );
        }
      } catch (error) {
        if (!signal.aborted && isLatestRequest()) {
          console.error(`Error in compute for ${name}:`, error);
        } else {
          console.warn(
            name,
            `Compute failed for ${hash} ${signal.aborted ? "on abort." : "on invalid compute."}`,
          );
        }
      } finally {
        if (isLatestRequest()) {
          if (!signal.aborted) {
            waitingOn.current = [];
            computingHashReference.current = null;
          }
          abortControllerReference.current = null;
        }
        recordStep(name, performance.now() - started);
      }
    },
    [inputs, computeFunction, name, currentHash],
  );

  useEffect(() => {
    // A restored input must not let the abandoned compute publish over it.
    if (computingHashReference.current !== null && computingHashReference.current !== currentHash) {
      if (abortControllerReference.current !== null) {
        abortControllerReference.current.abort();
        abortControllerReference.current = null;
      }
      computingHashReference.current = null;
    }

    // Clearing keeps lastComputed so the wait stays visible. That hash is finished only while its result is still present.
    if (published.lastComputed === currentHash && published.result !== null) {
      return;
    }

    if (computingHashReference.current === currentHash) {
      return;
    }

    const newWaitingOn = dependencies
      .filter(
        (dep): dep is DependencyObject<unknown> =>
          isDependencyObject(dep) && dep.currentHash !== dep.lastComputed,
      )
      .map((dep) => dep.name);

    if (newWaitingOn.length > 0) {
      if (published.result !== null && clearResults) {
        setPublished({ lastComputed: published.lastComputed, result: null });
      }
      waitingOn.current = newWaitingOn;
      return;
    }

    computingHashReference.current = currentHash;
    void compute(currentHash);
  }, [dependencies, compute, waitingOn, name, currentHash, published, clearResults]);

  const memoizedBase = useMemo(
    () => ({
      currentHash,
      [dependencyObjectSymbol]: true as const,
      name,
    }),
    [currentHash, name],
  );

  return useMemo(() => {
    const fullBase: DependencyObjectBase = {
      ...memoizedBase,
      lastComputed: published.lastComputed,
      waitingOn: waitingOn.current,
    };

    if (published.result === undefined)
      throw new Error(`Result can not be undefined: change the ${name} call`);

    return published.result === null
      ? { ...fullBase, result: null }
      : { ...fullBase, result: published.result };
  }, [memoizedBase, name, published]);
};
