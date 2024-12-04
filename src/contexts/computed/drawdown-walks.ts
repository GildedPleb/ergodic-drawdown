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
  ) {
    // console.log("drawdown walks returning nothing");
    return [];
  }
  // console.log("getting some walks", samplesToRender);

  const dataset: DatasetList = [];
  for (let index = 0; index < samplesToRender; index++) {
    console.log({ data: drawdownData.getRow(index), drawdownData });
    dataset.push({
      borderColor: generateColor(index),
      borderWidth: 1,
      data: Array.from(
        (drawdownData.getRow(index, true) ?? new Float64Array()).subarray(
          lastHalving,
        ),
        (point, innerIndex) => ({
          x: now + innerIndex * MS_PER_WEEK,
          y: point,
        }),
      ),
      label: `BTC Amount (${index})`,
      parsing: false,
      pointRadius: 0,
      tension: 0,
      yAxisID: "y1",
    });
  }
  // console.log({ dataset });
  return dataset;
};
