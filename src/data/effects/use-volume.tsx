import { useEffect } from "react";

import { useComputedValues } from "../../contexts/computed";
import { useVolumeData } from "../../contexts/volume";

export const useVolume = (): void => {
  const { setLoadingVolumeData } = useVolumeData();
  const { volume } = useComputedValues();

  useEffect(() => {
    if (volume === null) return;

    setLoadingVolumeData(false);
  }, [volume, setLoadingVolumeData]);
};
