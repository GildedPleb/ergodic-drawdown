import { type LRUCache } from "lru-cache";

import type VariableDrawdownCache from "../../classes/variable-drawdown-cache";
import { type OneOffFiatVariable } from "../../types";

const NO_CACHE_ERROR = "No cache for variable drawdown stats";

export const handleDrawdownVariableStats = (
  _signal: AbortSignal,
  _hash: string,
  activeOneOffVariables: OneOffFiatVariable[],
  variableDrawdownCache: LRUCache<string, VariableDrawdownCache>,
  showModel: boolean,
): Array<{ effectiveWeek: number; endWeek: number; name: string }> => {
  if (showModel) {
    console.log("NOT RENDERING VARIABLE DRAWDOWN");
    return [];
  }
  return [
    ...new Map(activeOneOffVariables.map((item) => [item.hash, item])).values(),
  ].flatMap((oneOffFiatVariable) => {
    const variableCache = variableDrawdownCache.get(oneOffFiatVariable.hash);
    if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);
    if (!variableCache.isFull()) {
      console.log("NOT FULL");
      return [];
    }
    const [effectiveWeek, endWeek] = variableCache.getGate();
    return { effectiveWeek, endWeek, name: oneOffFiatVariable.name };
  });
};
