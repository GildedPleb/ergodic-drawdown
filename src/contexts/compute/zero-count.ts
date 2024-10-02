export const calculateBalanceAndZero = (
  _signal: AbortSignal,
  _hash: string,
  volumeDataset: Float64Array[],
  showModel: boolean,
): { finalBalance: Float64Array; zero: number } => {
  if (showModel) return { finalBalance: new Float64Array(), zero: 0 };
  const datasetLength = volumeDataset.length;
  const finalBalance = new Float64Array(datasetLength);
  let zero = 0;
  for (let index = 0; index < datasetLength; index++) {
    const dataArray = volumeDataset[index];
    // eslint-disable-next-line unicorn/prefer-at
    const y = dataArray[dataArray.length - 1];
    finalBalance[index] = y;
    zero += y <= 0 ? 1 : 0;
  }
  return { finalBalance, zero };
};
