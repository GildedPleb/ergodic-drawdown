export const numberAt = (values: ArrayLike<number>, index: number): number => {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`missing number at index ${index}`);
  }
  return value;
};

// The last stored week can be NaN when that week is before the price series.
// Callers that carry a balance forward need the last real number instead.
export const lastFinite = (values: ArrayLike<number>): number | undefined => {
  for (let index = values.length - 1; index >= 0; index--) {
    const value = values[index];
    if (value !== undefined && !Number.isNaN(value)) return value;
  }
  return undefined;
};
