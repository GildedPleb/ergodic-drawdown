export const numberAt = (values: ArrayLike<number>, index: number): number => {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`missing number at index ${index}`);
  }
  return value;
};
