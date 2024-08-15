export const getDataSize = (data: Float64Array[]): number => {
  if (data.length === 0) return 0;
  const elementSize = 8;
  const singleArraySize = data[0].length * elementSize;
  const totalSize = singleArraySize * data.length;
  return totalSize / (1024 * 1024);
};
