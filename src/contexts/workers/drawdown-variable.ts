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

  const variableDrawdownCache = new VariableDrawdownCache(variableDrawdownBuffer);

  const location = arrayIndex * SIMULATIONS_PER_ARRAY;
  // -1 stays uncomputed. A searched path with no spend stores NaN for the week and the amount.
  const markSearched = (sample: number): void => {
    variableDrawdownCache.set(sample + location, Number.NaN, Number.NaN);
  };

  const priceNeeded = amountToday / btcWillingToSpend;
  const effectiveRatio = start / 100;

  for (let sample = startIndex; sample < endIndex; sample++) {
    if (signalState.aborted) {
      return;
    }
    const graph = data.getRow(sample);
    if (graph === undefined) {
      markSearched(sample);
      continue;
    }
    const graphLength = graph.length - weeksSince;
    const adjustedGraph = graph.slice(weeksSince);

    let first;
    for (let week = 0; week < graphLength; week++) {
      const inflation = inflationFactors[week];
      const price = adjustedGraph[week];
      if (inflation !== undefined && price !== undefined && priceNeeded * inflation < price) {
        first = week;
        break;
      }
    }
    if (first === undefined) {
      markSearched(sample);
      continue;
    }

    let last;
    for (let week = graphLength - 1; week >= first; week--) {
      const inflation = inflationFactors[week];
      const price = adjustedGraph[week];
      if (inflation !== undefined && price !== undefined && priceNeeded * inflation >= price) {
        last = week;
        break;
      }
    }
    if (last === graphLength - 1 && effectiveRatio !== 0) {
      // The series ended unaffordable, so the spend week is not known.
      markSearched(sample);
      continue;
    }

    const drawdownWeek =
      first +
      (last === undefined ? 0 : Math.floor((last - first) * effectiveRatio)) +
      delay +
      // I'm not sure where the off-by-one error arises, but this "+ 1" seems to fix it.
      1;
    if (drawdownWeek < graphLength) {
      const inflation = inflationFactors[drawdownWeek];
      if (inflation === undefined) {
        markSearched(sample);
      } else {
        variableDrawdownCache.set(sample + location, drawdownWeek, amountToday * inflation);
      }
    } else {
      markSearched(sample);
    }
  }
};
