import { MS_PER_WEEK } from "../../constants";
import { numberAt } from "../../number-at";
import { type DatasetList } from "../../types";

export const handleMaxModel = (
  _signal: AbortSignal,
  _hash: string,
  renderModelMax: boolean,
  maxArray: Float64Array[],
  now: number,
  dataLength: number,
): DatasetList => {
  if (!renderModelMax) return [];
  const series = maxArray[0];
  if (series === undefined) throw new Error("missing max series");
  const count = Math.min(dataLength, series.length);
  const maxPoints = [];
  for (let index = 0; index < count; index += 1) {
    maxPoints.push({
      x: now + index * MS_PER_WEEK,
      y: numberAt(series, index),
    });
  }
  return [
    {
      borderColor: "red",
      borderWidth: 0.5,
      data: maxPoints,
      label: `Model Max Value`,
      order: 2,
      parsing: false,
      pointRadius: 0,
      tension: 0,
    },
  ] satisfies DatasetList;
};
