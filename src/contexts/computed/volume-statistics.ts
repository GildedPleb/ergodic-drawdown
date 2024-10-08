import { quantile } from "../../helpers";

export const calculateVolumeStatistics = (
  _signal: AbortSignal,
  _hash: string,
  dataLength: number,
  { finalBalance }: { finalBalance: Float64Array; zero: number },
  showModel: boolean,
): { average: number; median: number } => {
  if (showModel) return { average: 0, median: 0 };
  let sum = 0;
  const length = finalBalance.length;

  // Calculate sum
  for (let index = 0; index < length; index++) {
    sum += finalBalance[index];
  }
  const average = sum / length;

  // Sort finalBalance in-place
  finalBalance.sort((first, second) => first - second);

  const middleQuant = quantile(finalBalance, 0.5);
  const median =
    middleQuant === 0 && dataLength === 0 ? Number.NaN : middleQuant;

  return { average, median };
};
