import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getInterimWeeklyData } from "../../api";
import { bitcoinColor } from "../../content";
import { useTime } from "../../contexts/time";
import { type Dataset } from "../../types";

export const useInterimDataset = (): Dataset => {
  const now = useTime();

  const { data: interim = [] } = useQuery({
    queryFn: async () => getInterimWeeklyData(now),
    queryKey: ["interim", now],
  });

  return useMemo(
    () => ({
      borderColor: bitcoinColor,
      borderWidth: 0.5,
      data: interim.map((item) => ({
        x: item.time * 1000,
        y: item.close,
      })),
      label: `Bitcoin Historic Price`,
      pointRadius: 0,
      tension: 0,
    }),
    [interim],
  );
};
