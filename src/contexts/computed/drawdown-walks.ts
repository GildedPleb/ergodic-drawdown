import type GrowableSharedArray from "../../classes/growable-shared-array";
import { MS_PER_WEEK } from "../../constants";
import { generateColor } from "../../helpers";
import { type DatasetList } from "../../types";

export const handleDrawdownWalkDataset = (
  _signal: AbortSignal,
  _has: string,
  now: number,
  drawdownData: GrowableSharedArray,
  renderDrawdownWalks: boolean,
  samplesToRender: number | undefined,
  lastHalving: number,
  showModel: boolean,
): DatasetList => {
  if (
    samplesToRender === undefined ||
    samplesToRender === 0 ||
    !renderDrawdownWalks ||
    showModel
  )
    return [];
  const dataset: DatasetList = [];
  for (let index = 0; index < samplesToRender; index++) {
    dataset.push({
      borderColor: generateColor(index),
      borderWidth: 1,
      data: Array.from(
        (drawdownData.getRow(index) ?? new Float64Array()).subarray(
          lastHalving,
        ),
        (point, innerIndex) => ({
          x: now + innerIndex * MS_PER_WEEK,
          y: point,
        }),
      ),
      label: `BTC Amount (${index})`,
      pointRadius: 0,
      tension: 0,
      yAxisID: "y1",
    });
  }
  return dataset;
};
