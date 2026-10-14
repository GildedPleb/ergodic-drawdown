import type VariableDrawdownCache from "../../classes/variable-drawdown-cache";
import { type OneOffFiatVariable } from "../../types";

const NO_CACHE_ERROR = "No cache for variable drawdown stats";

// endWeek is the last path that spent. While any path has no spend, the bracket stays open.
export type FiatVariableLabel = {
  effectiveWeek: number;
  endWeek?: number;
  name: string;
};

export const handleDrawdownVariableLabels = (
  _signal: AbortSignal,
  _hash: string,
  activeOneOffVariables: OneOffFiatVariable[],
  variableDrawdownCache: Map<string, VariableDrawdownCache>,
  showModel: boolean,
): FiatVariableLabel[] => {
  if (showModel) return [];
  return activeOneOffVariables.flatMap(({ hash, name }) => {
    const variableCache = variableDrawdownCache.get(hash);
    if (variableCache === undefined) throw new Error(NO_CACHE_ERROR);
    if (!variableCache.isFull()) {
      console.log(`Variable cache ${name}: NOT FULL! Returning no results.`);
      return [];
    }
    const [effectiveWeek, endWeek] = variableCache.getGate();
    if (!Number.isFinite(effectiveWeek) || !Number.isFinite(endWeek)) return [];
    if (variableCache.everySampleResolved()) return { effectiveWeek, endWeek, name };
    return { effectiveWeek, name };
  });
};
