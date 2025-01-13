import { type LRUCache } from "lru-cache";

import type GrowableSharedArray from "../../classes/growable-shared-array";
import VariableDrawdownCache from "../../classes/variable-drawdown-cache";
import { VariableDrawdownFinal } from "../../classes/variable-drawdown-final";
import { type WorkerContextType } from "../../contexts/workers";
import { createTaskQueue } from "../../helpers";
import { type NarrowedOneOffFiat } from "../../types";
import { type RunDrawdownVariableEvent } from "../workers/types";

const NO_CACHE_ERROR = "No cache for variable drawdown";

export const handleDrawdownVariables = async (
  signal: AbortSignal,
  _hash: string,
  epochCount: number,
  samples: number,
  fullHashInflation: string,
  simulationData: GrowableSharedArray,
  finalVariableCache: LRUCache<string, VariableDrawdownFinal>,
  activeOneOffVariables: NarrowedOneOffFiat[],
  variableDrawdownCache: LRUCache<string, VariableDrawdownCache>,
  worker: WorkerContextType,
  inflationFactors: Float64Array,
  weeksSince: number,
  variableCacheHash: string,
  showModel: boolean,
  // eslint-disable-next-line max-params
): Promise<string> => {
  const returnHash =
    epochCount + samples + variableCacheHash + fullHashInflation;

  if (showModel) {
    console.log("NOT RENDERING VARIABLE DRAWDOWN");
    return "not rendering:" + returnHash;
  }
  // console.log({
  //   activeOneOffVariables,
  //   epochCount,
  //   finalVariableCache,
  //   fullHashInflation,
  //   inflationFactors,
  //   samples,
  //   variableCacheHash,
  //   variableDrawdownCache,
  //   weeksSince,
  //   worker,
  // });
  // const previous = finalVariableCache.get(variableCacheHash);
  // if (previous !== undefined) {
  //   console.log("GOT FINAL CACHE HIT", previous);
  //   return variableCacheHash;
  // }
  const simulationExport = simulationData.exportState();

  const taskQueue = [
    ...new Map(activeOneOffVariables.map((item) => [item.hash, item])).values(),
  ].flatMap((oneOffFiatVariable) => {
    // Get the variable shared array buffer
    if (!variableDrawdownCache.has(oneOffFiatVariable.hash)) {
      // Add the item, since its not there.
      // console.log("adding the item");
      variableDrawdownCache.set(
        oneOffFiatVariable.hash,
        new VariableDrawdownCache(),
      );
    }
    const variableCache = variableDrawdownCache.get(oneOffFiatVariable.hash);
    const taskQueueSamples = [];
    if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);

    // Get the validity: The valid height that has been computed for so far.
    const { validHeight, validWidth } =
      variableCache.getValidity(fullHashInflation);
    // console.log({ validHeight, validWidth });
    if (validHeight === 0) {
      // If there is no valid height, clear everythign and continue to (samples > validHeight)
      // console.log("valid height 0, clearing cache");
      variableCache.clear();
    } else if (variableCache.isFull()) {
      // If the variable cache is full, meaning there are no samples that return -1,
      // then we should not need to compute anything w/r/t samples OR epochs.
      // console.log("variableCache is full", variableCache);
    } else if (epochCount > validWidth) {
      // This should only be run when the epoch count is extended.
      // console.log("variableCache is not full", variableCache);
      for (const spread of variableCache.getEmpty()) {
        const newTasks = createTaskQueue(
          spread[1],
          Math.ceil(worker.count / activeOneOffVariables.length),
          samples,
          spread[0],
        );
        // console.log("iterable", { newTasks, spread });
        taskQueueSamples.push(...newTasks);
      }
    } else {
      // However, if the epochCount is shorter... should we do anything? I don't thing so???
      // console.log({ epochCount, validWidth });
    }
    if (samples > validHeight)
      taskQueueSamples.push(
        ...createTaskQueue(
          samples,
          Math.ceil(worker.count / activeOneOffVariables.length),
          samples,
          validHeight,
        ),
      );
    // console.log({ buffer: sharedBuffers[task.arrayIndex] });
    return taskQueueSamples.map(
      (task) =>
        ({
          payload: {
            inflationFactors,
            oneOffFiatVariable,
            simulationExport,
            task,
            variableDrawdownBuffer: variableCache.getBuffer(),
            weeksSince,
          },
          type: "RUN_DRAWDOWN_VARIABLE",
        }) satisfies RunDrawdownVariableEvent,
    );
  });
  // console.log({ taskQueue });
  if (taskQueue.length === 0) {
    // console.log("NO TASKS", { activeOneOffVariables });
    const caches = [];
    for (const { hash } of activeOneOffVariables) {
      const variableCache = variableDrawdownCache.get(hash);
      if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);
      variableCache.setValidity(fullHashInflation, samples, epochCount);
      if (variableCache.isFull()) caches.push(variableCache);
    }
    const finalResults = new VariableDrawdownFinal(
      caches,
      activeOneOffVariables.length,
      samples,
    );
    finalVariableCache.set(variableCacheHash, finalResults);
    return "no tasks:" + returnHash;
  }

  const results = await worker.addTasks(taskQueue, signal);

  if (results.some((result) => result.status === "aborted")) {
    console.log("aborted");
  } else {
    const caches = [];
    for (const { hash } of activeOneOffVariables) {
      const variableCache = variableDrawdownCache.get(hash);
      if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);
      variableCache.setValidity(fullHashInflation, samples, epochCount);
      if (variableCache.isFull()) caches.push(variableCache);
    }
    const finalResults = new VariableDrawdownFinal(
      caches,
      activeOneOffVariables.length,
      samples,
    );
    finalVariableCache.set(variableCacheHash, finalResults);
  }
  return "success:" + returnHash;
};
