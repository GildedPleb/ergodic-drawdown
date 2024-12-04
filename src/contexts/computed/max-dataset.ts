import { MS_PER_WEEK } from "../../constants";
import { type DatasetList } from "../../types";

export const handleMaxModel = (
  _signal: AbortSignal,
  _hash: string,
  renderModelMax: boolean,
  maxArray: Float64Array[],
  now: number,
): DatasetList => {
  if (!renderModelMax) return [];
  const maxPoints = [];
  let index = 0;
  for (const price of maxArray[0]) {
    maxPoints.push({
      x: now + index * MS_PER_WEEK,
      y: price,
    });
    index++;
  }
  return [
    {
      borderColor: "red",
      borderWidth: 0.5,
      data: maxPoints,
      label: `Model Max Value`,
      parsing: false,
      pointRadius: 0,
      tension: 0,
    },
  ] satisfies DatasetList;
};
