import { useModel } from "../contexts/model";
import { usePriceData } from "../contexts/price";
import { useVolumeData } from "../contexts/volume";
import { useMemory } from "../data/data-size";

const DataPointCount = (): JSX.Element => {
  const { loadingPriceData, priceData } = usePriceData();
  const { volumeData } = useVolumeData();
  const { samples } = useModel();
  const using =
    priceData.length * priceData[0]?.length +
    volumeData.length * volumeData[0]?.length;

  const memoryUsageMB = useMemory();

  let memoryUsageClass = "";
  if (memoryUsageMB > 1024) {
    memoryUsageClass = "memory-high";
  } else if (memoryUsageMB > 256) {
    memoryUsageClass = "memory-medium";
  }
  const beginning = `(${using.toLocaleString()} data points @`;
  const mid = `~${memoryUsageMB.toFixed(0)} MB`;
  const end = `)`;

  return loadingPriceData || samples === 0 ? (
    <div className="loader" />
  ) : (
    <>
      <span>{beginning}</span>
      <span className={memoryUsageClass}>{mid}</span>
      <span>{end}</span>
    </>
  );
};

export default DataPointCount;
