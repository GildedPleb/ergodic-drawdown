import { useQuery } from "@tanstack/react-query";

import { getCurrentPrice } from "../../api";
import { useTime } from "../../contexts/time";

const useCurrentPrice = (): number => {
  const now = useTime();

  const { data: currentPrice = 0 } = useQuery({
    placeholderData: 0,
    queryFn: async () => {
      const newPrice = await getCurrentPrice(now);
      return newPrice.close;
    },
    queryKey: ["currentPrice", now],
    staleTime: Infinity,
  });

  return currentPrice;
};

export default useCurrentPrice;
