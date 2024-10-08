import { MS_PER_WEEK } from "../../constants";
import { type DatasetList } from "../../types";

export const handleMinModel = (
  _signal: AbortSignal,
  _hash: string,
  renderModelMin: boolean,
  minArray: Float64Array[],
  now: number,
): DatasetList => {
  if (!renderModelMin) return [];
  const minPoints = [];
  let index = 0;
  for (const price of minArray[0]) {
    minPoints.push({
      x: now + index * MS_PER_WEEK,
      y: price,
    });
    index++;
  }
  return [
    {
      borderColor: "green",
      borderWidth: 0.5,
      data: minPoints,
      label: `Model Min Value`,
      pointRadius: 0,
      tension: 0,
    },
  ];
};
