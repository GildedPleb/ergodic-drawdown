/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/no-null */
import hashSum from "hash-sum";
import { LRUCache } from "lru-cache";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import SharedArrayPool from "../../../classes/shared-stack-cache-pool";
import type VariableDrawdownCache from "../../../classes/variable-drawdown-cache";
import { type VariableDrawdownFinal } from "../../../classes/variable-drawdown-final";
import { type DrawdownStaticReturn } from "../../../contexts/compute/drawdown-static";
import { type WorkerContextType } from "../../../contexts/workers";
import {
  type TaskResult,
  type WorkerTasks,
} from "../../../contexts/workers/types";
import {
  type Full,
  type OneOffFiatVariable,
  type OneOffItem,
  type ReoccurringItem,
} from "../../../types";

const dependencyObjectSymbol = Symbol("DependencyObject");

type PrimitiveDependency =
  | ((abortId: string) => void)
  | ((tasks: WorkerTasks[]) => Promise<TaskResult[]>)
  | {
      finalBalance: Float64Array;
      zero: number;
    }
  | DrawdownStaticReturn
  | Float64Array
  | Float64Array[]
  | Full
  | LRUCache<string, VariableDrawdownCache>
  | LRUCache<string, VariableDrawdownFinal>
  | OneOffFiatVariable[]
  | OneOffItem[]
  | ReoccurringItem[]
  | SharedArrayPool
  | WorkerContextType
  | boolean
  | number
  | string;

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

export interface DependencyObjectLoading extends DependencyObjectBase {
  result: null;
}

export interface DependencyObjectLoaded<R> extends DependencyObjectBase {
  result: R;
}

export type DependencyObject<R> =
  | DependencyObjectLoaded<R>
  | DependencyObjectLoading;

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
  return (
    Boolean(dep) &&
    typeof dep === "object" &&
    dep !== null &&
    dependencyObjectSymbol in dep
  );
}

const fastCustomHashSum = <T extends PrimitiveDependency[], P>(
  dependencies: [...T, ...Array<Dependency<P>>],
): string => {
  const length = dependencies.length;
  const parts: string[] = Array.from({ length });
  for (let index = 0; index < length; index++) {
    const dep = dependencies[index];

    if (dep instanceof SharedArrayPool) {
      parts[index] = "SharedArrayPool";
    } else if (dep instanceof Float64Array) {
      parts[index] = "Float64Array";
    } else if (
      Array.isArray(dep) &&
      dep.some((item) => item instanceof Float64Array)
    ) {
      parts[index] = "Float64Array[]";
    } else if (dep instanceof LRUCache) {
      parts[index] = "LRUCache";
    } else if (isDependencyObject(dep)) {
      parts[index] = dep.currentHash;
    } else if (typeof dep === "function") {
      parts[index] = "function";
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (typeof dep === "object" && dep !== null) {
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
    } else {
      parts[index] = String(dep);
    }
  }

  const toHash = parts.join("|");
  return hashSum(toHash);
};

export const useDependency = <T extends PrimitiveDependency[], R, P>(
  name: string,
  computeFunction: ComputeFunction<T, R>,
  dependencies: [...T, ...Array<Dependency<P>>],
): DependencyObject<R> => {
  const [result, setResult] = useState<R | null>(null);

  const abortControllerReference = useRef<AbortController | null>(null);
  const computingHashReference = useRef<null | string>(null);
  const latestComputeRequestReference = useRef<null | symbol>(null);
  const timerRunningReference = useRef<boolean>(false);
  const lastComputed = useRef<string>("");
  const waitingOn = useRef<string[]>([]);

  const startTimer = useCallback(() => {
    if (!timerRunningReference.current) {
      console.time(name);
      timerRunningReference.current = true;
    }
  }, [name]);

  const endTimer = useCallback(() => {
    if (timerRunningReference.current) {
      console.timeEnd(name);
      timerRunningReference.current = false;
    }
  }, [name]);

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
        const deps = dependencies.slice(0, computeFunction.length - 1) as T;
        // console.log(name, `Attempting Compute for ${hash}`);

        const computedResult = await computeFunction(signal, hash, ...deps);

        if (!signal.aborted && isLatestRequest()) {
          console.log(name, `Completed Compute for ${hash}`);
          setResult(computedResult);
          lastComputed.current = currentHash;
        } else {
          console.log(name, `Failed Compute for ${hash}`, signal.aborted);
        }
      } catch (error) {
        if (!signal.aborted && isLatestRequest()) {
          console.error(`Error in compute for ${name}:`, error);
        }
      } finally {
        if (isLatestRequest()) {
          if (!signal.aborted) {
            waitingOn.current = [];
            computingHashReference.current = null;
          }
          // eslint-disable-next-line require-atomic-updates
          abortControllerReference.current = null;
        }
        endTimer();
      }
    },
    [dependencies, computeFunction, name, endTimer, currentHash],
  );

  useEffect(() => {
    startTimer();
    // console.log(name, {
    //   currentHash,
    //   dependencies,
    //   last: lastComputed.current,
    //   waitingOn: waitingOn.current,
    // });

    // Check if we have already computed this hash, if we have, we don't need to compute it again.
    if (lastComputed.current === currentHash) {
      // console.log(name, `Already computed ${currentHash}. Should not compute.`);
      return;
    }

    // Check if we are currently computing this hash, if we are, we don't need to do anything.
    if (computingHashReference.current === currentHash) {
      // console.log(name, `already computing ${currentHash} skipping`);
      return;
    }

    // Check if we are currently computing a different hash
    if (
      computingHashReference.current !== null &&
      computingHashReference.current !== currentHash
    ) {
      // console.log(name, "Dependencies changed, aborting current compute");
      // If we are, and we are currently computing a hash that isn't the current hash, we should abort it.
      if (abortControllerReference.current !== null) {
        abortControllerReference.current.abort();
        abortControllerReference.current = null;
      }
      computingHashReference.current = null;
    }

    // So, we have a new hash we have not completed.
    // console.log(name, `Incomplete Compute Detected`);
    // Now, we need to see if we can complete it yet, or if we should wait on our dependencies to complete first.
    const newWaitingOn = dependencies
      .filter(
        (dep): dep is DependencyObject<P> =>
          isDependencyObject(dep) && dep.currentHash !== dep.lastComputed,
      )
      .map((dep) => dep.name);

    // if they are a dependency obj, if even 1 of their current DOES NOT match their last, then they have NOT completed and we are waiting on them.
    if (newWaitingOn.length > 0) {
      // console.log(name, `waiting on [${newWaitingOn.join(",")}]`);
      if (result !== null) setResult(null);
      waitingOn.current = newWaitingOn;
      return;
    }

    // Otherwise, --> ALL their current hashes match their last computed hash, then they have all completed, and we are not waiting on them
    computingHashReference.current = currentHash;
    void compute(currentHash);
    // console.log(name, `Started Compute for ${currentHash}`);
  }, [dependencies, compute, waitingOn, name, currentHash, result, startTimer]);

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
      lastComputed: lastComputed.current,
      waitingOn: waitingOn.current,
    };

    if (result === undefined)
      throw new Error(`Result can not be undefined: change the ${name} call`);

    return result === null
      ? { ...fullBase, result: null }
      : { ...fullBase, result };
  }, [memoizedBase, name, result]);
};
