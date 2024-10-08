import type GrowableSharedArray from "../../classes/growable-shared-array";

export const calculateBalanceAndZero = (
  _signal: AbortSignal,
  _hash: string,
  drawdownData: GrowableSharedArray,
  showModel: boolean,
): { finalBalance: Float64Array; zero: number } => {
  if (showModel) return { finalBalance: new Float64Array(), zero: 0 };
  const finalBalance = drawdownData.getLastArray();
  let zero = 0;
  for (const item of finalBalance) {
    zero += item <= 0 ? 1 : 0;
  }
  return { finalBalance, zero };
};
