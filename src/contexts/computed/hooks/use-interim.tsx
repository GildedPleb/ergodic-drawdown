import { useQuery } from "@tanstack/react-query";

import { getInterimWeeklyData } from "../../../api";
import { useTime } from "../../../contexts/time";
import { type BitcoinDataPoint } from "../../../types";

export const useInterimDataset = (): BitcoinDataPoint[] => {
  const now = useTime();

  const { data: interim = [] } = useQuery({
    queryFn: async () => getInterimWeeklyData(now),
    queryKey: ["interim", now],
  });

  return interim;
};
