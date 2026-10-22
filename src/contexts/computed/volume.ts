import type GrowableSharedArray from "../../classes/growable-shared-array";
import { type VariableDrawdownFinal } from "../../classes/variable-drawdown-final";
import { chartWeeksCovered, columnOfChartWeek, epochsForNewSamples } from "../../horizon";
import { createTaskQueue } from "../../helpers";
import { type WorkerContextType } from "../workers/types";
import { type RunVolumeEvent } from "../workers/types";
import { type DrawdownStaticReturn } from "./drawdown-static";

const NO_CACHE_ERROR = "No cache for variable drawdown";

export const handleVolume = async (
  signal: AbortSignal,
  _hash: string,
  bitcoin: number,
  { seriesHash, totalWeeklyBitcoinItems, totalWeeklyFiatItems }: DrawdownStaticReturn,
  variableDrawdownCache: Map<string, VariableDrawdownFinal>,
  samples: number,
  epochCount: number,
  simulationData: GrowableSharedArray,
  drawdownData: GrowableSharedArray,
  volumeCacheHash: string,
  variableCacheHash: string,
  priceIdentity: string,
  weeksSince: number,
  dataLength: number,
  worker: WorkerContextType,
  showModel: boolean,
): Promise<string> => {
  const returnHash = volumeCacheHash + samples + epochCount + dataLength + variableCacheHash;
  if (showModel) return "not shown:" + returnHash;

  const variableCache = variableDrawdownCache.get(variableCacheHash);
  if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);
  const exportedVariableCache = variableCache.exportState();

  // The walked samples' spends, the cashflow amounts, and the price series name the balances.
  // A sample added on the end keeps those spends and walks the trusted columns.
  const base = `${volumeCacheHash}:${weeksSince}:${seriesHash}:${priceIdentity}`;
  const stored = drawdownData.storedValidity();
  let gridHash = `${base}:${variableCache.spendHash(samples)}`;
  if (stored.height > 0 && stored.height < samples) {
    const prefixHash = `${base}:${variableCache.spendHash(stored.height)}`;
    if (stored.hash === prefixHash) gridHash = prefixHash;
  }
  const [, validHeight] = drawdownData.getValidity(gridHash);
  const balancedWeeks = drawdownData.getCoveredWeeks(gridHash);
  const walkEpochs = epochsForNewSamples(
    weeksSince,
    balancedWeeks,
    epochCount,
    samples,
    validHeight,
  );
  const catchingUp = walkEpochs > epochCount;
  drawdownData.resize(epochCount, samples);
  if (!catchingUp && validHeight !== 0 && dataLength <= balancedWeeks && samples <= validHeight) {
    return "no tasks:" + returnHash;
  }
  const restoreWidth = (): void => {
    drawdownData.resize(epochCount, samples);
  };
  if (catchingUp) drawdownData.resize(walkEpochs, samples);
  // A present column is skipped, so the first missing column has to be cleared.
  const extending = validHeight !== 0 && dataLength > balancedWeeks;
  if (validHeight === 0) drawdownData.clear();
  else if (extending) {
    const resume = columnOfChartWeek(weeksSince, balancedWeeks);
    for (let epoch = resume; epoch < epochCount; epoch += 1) {
      drawdownData.clearEpoch(epoch);
    }
  }
  const needTasksForWidth = validHeight === 0 || extending;
  const liveSamples = Math.min(validHeight, samples);

  const taskQueueEpochs = needTasksForWidth
    ? createTaskQueue(liveSamples, worker.count, samples, 0)
    : [];

  const taskQueueSamples = createTaskQueue(samples, worker.count, samples, validHeight);

  const taskQueue = taskQueueEpochs.concat(taskQueueSamples);
  if (taskQueue.length === 0) {
    if (catchingUp) restoreWidth();
    return "no tasks:" + returnHash;
  }
  const drawdownExport = drawdownData.exportState();
  const simulationExport = simulationData.exportState();
  if (catchingUp) {
    // The live price grid stays on the requested year. Trusted columns are still in the buffer.
    simulationExport.activeWidth = Math.min(walkEpochs, simulationExport.width);
  }

  const processedTasks = taskQueue.map((task) => {
    return {
      payload: {
        bitcoin,
        drawdownExport,
        epochCount: walkEpochs,
        exportedVariableCache,
        simulationExport,
        task,
        totalWeeklyBitcoinItems,
        totalWeeklyFiatItems,
        weeksSince,
      },
      type: "RUN_VOLUME",
    } satisfies RunVolumeEvent;
  });

  const results = await worker.addTasks(processedTasks, signal);

  if (results.some((result) => result.status === "aborted")) {
    console.log("VOLUME TASKS ABORTED");
    if (catchingUp) restoreWidth();
    return "failed:" + returnHash;
  }
  if (catchingUp) restoreWidth();
  // The new rows belong to the full spend. The trusted column count stays.
  const publishHash = `${base}:${variableCache.spendHash(samples)}`;
  if (publishHash === gridHash) drawdownData.setValidity(gridHash);
  else {
    const trustedWidth = stored.width;
    if (trustedWidth > 0) drawdownData.setValidity(publishHash, trustedWidth);
    else drawdownData.setValidity(publishHash);
  }
  drawdownData.setCoveredWeeks(publishHash, chartWeeksCovered(weeksSince, walkEpochs));
  return "success:" + returnHash;
};
