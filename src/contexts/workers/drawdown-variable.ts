/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable security/detect-object-injection */

import GrowableSharedArray from "../../classes/growable-shared-array";
import VariableDrawdownCache from "../../classes/variable-drawdown-cache";
import { SIMULATIONS_PER_ARRAY } from "../../constants";
import { type RunDrawdownVariableEvent, type SignalState } from "./types";

export const handleDrawdownVariable = (
  payload: RunDrawdownVariableEvent["payload"],
  signalState: SignalState,
): void => {
  if (signalState.aborted) {
    return;
  }
  const {
    inflationFactors,
    oneOffFiatVariable: { amountToday, btcWillingToSpend, delay, start },
    simulationExport,
    task: { arrayIndex, endIndex, startIndex },
    variableDrawdownBuffer,
    weeksSince,
  } = payload;

  const data = GrowableSharedArray.fromExportedState(simulationExport);

  const variableDrawdownCache = new VariableDrawdownCache(
    variableDrawdownBuffer,
  );

  const location = arrayIndex * SIMULATIONS_PER_ARRAY;

  const priceNeeded = amountToday / btcWillingToSpend;
  const effectiveRatio = start / 100;
  // console.log({
  // amount: amountToday * inflationFactors[drawdownWeek],
  // drawdownWeek,
  // inflationFactorsLength: inflationFactors,
  // loc: sample * location,
  // });

  for (let sample = startIndex; sample < endIndex; sample++) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signalState.aborted) {
      return;
    }
    const graph = data.getRow(sample);
    if (graph === undefined) continue;
    const graphLength = graph.length - weeksSince;
    const adjustedGraph = graph.slice(weeksSince);

    let first;
    for (let week = 0; week < graphLength; week++) {
      if (priceNeeded * inflationFactors[week] < adjustedGraph[week]) {
        first = week;
        break;
      }
    }
    if (first === undefined) continue;

    let last;
    for (let week = graphLength - 1; week >= first; week--) {
      if (priceNeeded * inflationFactors[week] >= adjustedGraph[week]) {
        last = week;
        break;
      }
    }
    if (last === graphLength - 1 && effectiveRatio !== 0) continue;

    const drawdownWeek =
      first +
      (last === undefined ? 0 : Math.floor((last - first) * effectiveRatio)) +
      delay +
      // I'm not sure where the off-by-one error arises, but this "+ 1" seems to fix it.
      1;
    if (drawdownWeek < graphLength) {
      // console.log({
      //   amount: amountToday * inflationFactors[drawdownWeek],
      //   drawdownWeek,
      //   inflationFactorsLength: inflationFactors.length,
      //   loc: sample * location,
      // });
      variableDrawdownCache.set(
        sample + location,
        drawdownWeek,
        amountToday * inflationFactors[drawdownWeek],
      );
    }
  }
};
