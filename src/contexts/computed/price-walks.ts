import type GrowableSharedArray from "../../classes/growable-shared-array";
import { MS_PER_WEEK } from "../../constants";
import { generateColor } from "../../helpers";
import { type DatasetList } from "../../types";

export const handlePriceWalkDataset = (
  _signal: AbortSignal,
  _has: string,
  now: number,
  simulationData: GrowableSharedArray,
  renderPriceWalks: boolean,
  samplesToRender: number | undefined,
  lastHalving: number,
): DatasetList => {
  if (
    samplesToRender === undefined ||
    samplesToRender === 0 ||
    !renderPriceWalks
  )
    return [];
  const dataset: DatasetList = [];
  for (let index = 0; index < samplesToRender; index++) {
    dataset.push({
      borderColor: generateColor(index),
      borderWidth: 0.5,
      data: Array.from(
        (simulationData.getRow(index) ?? new Float64Array()).subarray(
          lastHalving,
        ),
        (point, innerIndex) => ({
          x: now + innerIndex * MS_PER_WEEK,
          y: point,
        }),
      ),
      label: `Potential Bitcoin Price (${index})`,
      order: 1,
      parsing: false,
      pointRadius: 0,
      tension: 0,
    });
  }
  return dataset;
};
