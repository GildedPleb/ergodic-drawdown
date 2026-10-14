import { type ChartOptions, type Point } from "chart.js";
import { type LineAnnotationOptions } from "chartjs-plugin-annotation";
import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";
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

const dependencyObjectSymbol = Symbol("DependencyObject");

type PrimitiveDependency =
  | ((abortId: string) => void)
  | ((tasks: WorkerTasks[]) => Promise<TaskResult[]>)
  | {
      finalBalance: Float64Array;
      zero: number;
    }
  | Array<{
      effectiveWeek: number;
      endWeek: number;
      name: string;
    }>
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
  | LRUCache<string, VariableDrawdownCache>
  | LRUCache<string, VariableDrawdownFinal>
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

/**
 *
 * @param dep -dep
 */
function assertDependencyLoaded<R>(
  dep: DependencyObject<R>,
): asserts dep is DependencyObjectLoaded<R> {
  if (dep.result === null) {
    // do nothing
  }
}

/**
 *
 * @param dep - deps
 * @returns not a null dep
 */
export function narrow<R>(dep: DependencyObject<R>): R {
  assertDependencyLoaded(dep);
  return dep.result;
}
/**
 *
 * @param dep - A Dependency
 * @returns typecast
 */
function isDependencyObject<R>(dep: unknown): dep is DependencyObject<R> {
  return Boolean(dep) && typeof dep === "object" && dep !== null && dependencyObjectSymbol in dep;
}

/**
 *
 * @param object - object to test
 * @returns status
 */
function isDatasetOrDatasetList(object: unknown): boolean {
  if (Array.isArray(object)) {
    // Check if it's potentially a DatasetList
    if (object.length > 0 && isDataset(object[0])) {
      return true;
    }
  } else if (typeof object === "object" && object !== null && isDataset(object)) {
    return true;
  }
  return false;
}

/**
 *
 * @param object - object to test
 * @returns status
 */
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

/**
 *
 * @param point - object to test
 * @returns status
 */
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
    } else if (dep instanceof LRUCache) {
      parts[index] = "LRUCache";
    } else if (isDependencyObject(dep)) {
      parts[index] = dep.currentHash;
    } else if (typeof dep === "function") {
      parts[index] = "function";
    } else if (typeof dep === "object" && dep !== null) {
      if (isDatasetOrDatasetList(dep)) {
        parts[index] = "Dataset";
      } else {
        // New handling for objects that may contain Float64Array values
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
  const timerRunningReference = useRef<boolean>(false);
  const individualTimerRunningReference = useRef<boolean>(false);
  const waitingOn = useRef<string[]>([]);

  const startTimer = useCallback(() => {
    if (!timerRunningReference.current) {
      console.time(name + " Finished around");
      timerRunningReference.current = true;
    }
  }, [name]);

  const endTimer = useCallback(() => {
    if (timerRunningReference.current) {
      console.timeEnd(name + " Finished around");
      timerRunningReference.current = false;
    }
  }, [name]);

  const innerStartTimer = useCallback(() => {
    if (!individualTimerRunningReference.current) {
      console.time(name + " Took");
      individualTimerRunningReference.current = true;
    }
  }, [name]);

  const innerEndTimer = useCallback(() => {
    if (individualTimerRunningReference.current) {
      console.timeEnd(name + " Took");
      individualTimerRunningReference.current = false;
    }
  }, [name]);

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

      try {
        // console.log(name, `Attempting Compute for ${hash}`);
        innerStartTimer();
        const computedResult = await computeFunction(signal, hash, ...inputs);

        if (!signal.aborted && isLatestRequest()) {
          // console.log(name, `Completed Compute for ${hash}`);
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
        innerEndTimer();
        endTimer();
      }
    },
    [inputs, computeFunction, innerStartTimer, name, currentHash, endTimer, innerEndTimer],
  );

  useEffect(() => {
    startTimer();
    // console.log(name, {
    //   currentHash,
    //   dependencies,
    //   last: published.lastComputed,
    //   waitingOn: waitingOn.current,
    // });

    // A restored input must not let the abandoned compute publish over it.
    if (computingHashReference.current !== null && computingHashReference.current !== currentHash) {
      // console.log(name, "Dependencies changed, aborting current compute");
      if (abortControllerReference.current !== null) {
        abortControllerReference.current.abort();
        abortControllerReference.current = null;
      }
      computingHashReference.current = null;
    }

    // Clearing keeps lastComputed so the wait stays visible. That hash is finished only while its result is still present.
    if (published.lastComputed === currentHash && published.result !== null) {
      // console.log(name, `Already computed ${currentHash}. Should not compute.`);
      return;
    }

    // Check if we are currently computing this hash, if we are, we don't need to do anything.
    if (computingHashReference.current === currentHash) {
      // console.log(name, `already computing ${currentHash} skipping`);
      return;
    }

    // So, we have a new hash we have not completed.
    // console.log(name, `Incomplete Compute Detected`);
    // Now, we need to see if we can complete it yet, or if we should wait on our dependencies to complete first.
    const newWaitingOn = dependencies
      .filter(
        (dep): dep is DependencyObject<unknown> =>
          isDependencyObject(dep) && dep.currentHash !== dep.lastComputed,
      )
      .map((dep) => dep.name);

    // if they are a dependency obj, if even 1 of their current DOES NOT match their last, then they have NOT completed and we are waiting on them.
    if (newWaitingOn.length > 0) {
      // console.log(name, `waiting on [${newWaitingOn.join(",")}]`);
      if (published.result !== null && clearResults) {
        setPublished({ lastComputed: published.lastComputed, result: null });
      }
      waitingOn.current = newWaitingOn;
      return;
    }

    // Otherwise, --> ALL their current hashes match their last computed hash, then they have all completed, and we are not waiting on them
    computingHashReference.current = currentHash;
    void compute(currentHash);
    // console.log(name, `Started Compute for ${currentHash}`);
  }, [dependencies, compute, waitingOn, name, currentHash, published, startTimer, clearResults]);

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
