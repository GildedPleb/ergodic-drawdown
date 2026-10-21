import { MS_PER_WEEK } from "../../constants";
import { numberAt } from "../../number-at";
import { type DatasetList } from "../../types";

export const handleMinModel = (
  _signal: AbortSignal,
  _hash: string,
  renderModelMin: boolean,
  minArray: Float64Array[],
  now: number,
  dataLength: number,
): DatasetList => {
  if (!renderModelMin) return [];
  const series = minArray[0];
  if (series === undefined) throw new Error("missing min series");
  const count = Math.min(dataLength, series.length);
  const minPoints = [];
  for (let index = 0; index < count; index += 1) {
    minPoints.push({
      x: now + index * MS_PER_WEEK,
      y: numberAt(series, index),
    });
  }
  return [
    {
      borderColor: "green",
      borderWidth: 0.5,
      data: minPoints,
      label: `Model Min Value`,
      order: 2,
      parsing: false,
      pointRadius: 0,
      tension: 0,
    },
  ];
};
