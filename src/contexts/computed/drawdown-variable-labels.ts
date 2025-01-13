import { type LRUCache } from "lru-cache";

import type VariableDrawdownCache from "../../classes/variable-drawdown-cache";
import { type OneOffFiatVariable } from "../../types";

const NO_CACHE_ERROR = "No cache for variable drawdown stats";

export const handleDrawdownVariableLabels = (
  _signal: AbortSignal,
  _hash: string,
  activeOneOffVariables: OneOffFiatVariable[],
  variableDrawdownCache: LRUCache<string, VariableDrawdownCache>,
  showModel: boolean,
): Array<{ effectiveWeek: number; endWeek: number; name: string }> => {
  console.log("HIT");
  if (showModel) {
    console.log("NOT RENDERING VARIABLE DRAWDOWN");
    return [];
  }
  return activeOneOffVariables.flatMap(({ hash, name }) => {
    const variableCache = variableDrawdownCache.get(hash);
    if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);
    if (!variableCache.isFull()) {
      console.log(`Variable cache ${name}: NOT FULL! Returning no results.`);
      return [];
    }
    const [effectiveWeek, endWeek] = variableCache.getGate();
    return { effectiveWeek, endWeek, name };
  });
};
