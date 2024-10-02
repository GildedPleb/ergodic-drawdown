import styled from "styled-components";

import { useComputedValues } from "../contexts/computed";
import { useModel } from "../contexts/model";
import { usePriceData } from "../contexts/price";
import { useMemory } from "../data/data-size";
import Loading from "./loading";

const MemoryUsageSpan = styled.span<{ $memoryUsageMB: number }>`
  color: ${({ $memoryUsageMB }) =>
    $memoryUsageMB > 1024
      ? "red"
      : $memoryUsageMB > 256
        ? "yellow"
        : "inherit"};
`;

const DataPointCount = (): JSX.Element => {
  const { loadingPriceData } = usePriceData();
  const { dataLength, volume } = useComputedValues();
  const { samples } = useModel();
  const using =
    samples * dataLength + (volume ?? []).length * (volume ?? [])[0]?.length;

  const memoryUsageMB = useMemory();

  const beginning = `${using.toLocaleString()} data points @`;
  const mid = `~${memoryUsageMB.toFixed(0)} MB`;

  return loadingPriceData || samples === 0 ? (
    <Loading />
  ) : (
    <>
      <span>{beginning}</span>
      <MemoryUsageSpan $memoryUsageMB={memoryUsageMB}>{mid}</MemoryUsageSpan>
    </>
  );
};

export default DataPointCount;
