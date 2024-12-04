import { type DatasetList } from "../../types";

export const getDataSetSize = (data: DatasetList): number => {
  let totalSize = 0;
  const numberSize = 8;

  for (const dataset of data) {
    totalSize += (dataset.label?.length ?? 0) * 2;
    if (dataset.yAxisID !== undefined) totalSize += dataset.yAxisID.length * 2;
    totalSize += numberSize;
    totalSize += numberSize;
    if (dataset.borderWidth !== undefined) totalSize += numberSize;
    if (dataset.borderDash !== undefined) {
      totalSize += dataset.borderDash.length * numberSize;
    }
    totalSize += dataset.data.length * (numberSize * 2);
    if (typeof dataset.fill === "string") {
      totalSize += dataset.fill.length * 2;
    } else if (typeof dataset.fill === "boolean") {
      totalSize += 4;
    }
  }
  return totalSize / (1024 * 1024);
};
