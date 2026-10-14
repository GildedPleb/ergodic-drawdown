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
  finalVariableCache: Map<string, VariableDrawdownFinal>,
  activeOneOffVariables: NarrowedOneOffFiat[],
  variableDrawdownCache: Map<string, VariableDrawdownCache>,
  worker: WorkerContextType,
  inflationFactors: Float64Array,
  weeksSince: number,
  variableCacheHash: string,
  showModel: boolean,
): Promise<string> => {
  const returnHash = epochCount + samples + variableCacheHash + fullHashInflation;

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
  const activeHashes = new Set(activeOneOffVariables.map((item) => item.hash));
  for (const key of variableDrawdownCache.keys()) {
    if (!activeHashes.has(key)) variableDrawdownCache.delete(key);
  }
  // The stored week index is sliced by weeksSince. A matching model hash is not enough.
  const validityHash = `${fullHashInflation}:${weeksSince}`;

  const taskQueue = [
    ...new Map(activeOneOffVariables.map((item) => [item.hash, item])).values(),
  ].flatMap((oneOffFiatVariable) => {
    // Get the variable shared array buffer
    if (!variableDrawdownCache.has(oneOffFiatVariable.hash)) {
      // Add the item, since its not there.
      // console.log("adding the item");
      variableDrawdownCache.set(oneOffFiatVariable.hash, new VariableDrawdownCache());
    }
    const variableCache = variableDrawdownCache.get(oneOffFiatVariable.hash);
    const taskQueueSamples = [];
    if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);

    // Get the validity: The valid height that has been computed for so far.
    const { validHeight, validWidth } = variableCache.getValidity(validityHash);
    // The spend week is the last unaffordable week inside this series. Another length is another answer.
    const seriesChanged = validHeight !== 0 && epochCount !== validWidth;
    if (validHeight === 0 || seriesChanged) variableCache.clear();
    const searchedSamples = validHeight === 0 || seriesChanged ? 0 : validHeight;
    if (samples > searchedSamples)
      taskQueueSamples.push(
        ...createTaskQueue(
          samples,
          Math.ceil(worker.count / activeOneOffVariables.length),
          samples,
          searchedSamples,
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
  const publishFinal = (): void => {
    const caches = [];
    for (const { hash } of activeOneOffVariables) {
      const variableCache = variableDrawdownCache.get(hash);
      if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);
      variableCache.setValidity(validityHash, samples, epochCount);
      if (variableCache.isFull()) caches.push(variableCache);
    }
    const finalResults = new VariableDrawdownFinal(caches, activeOneOffVariables.length, samples);
    finalVariableCache.set(variableCacheHash, finalResults);
    for (const key of finalVariableCache.keys()) {
      if (key !== variableCacheHash) finalVariableCache.delete(key);
    }
  };

  if (taskQueue.length === 0) {
    publishFinal();
    return "no tasks:" + returnHash;
  }

  const results = await worker.addTasks(taskQueue, signal);

  if (results.some((result) => result.status === "aborted")) {
    console.log("aborted");
  } else {
    publishFinal();
  }
  return "success:" + returnHash;
};
