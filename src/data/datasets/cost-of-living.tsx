import { useMemo } from "react";

import { MS_PER_WEEK, WEEKS_PER_YEAR } from "../../constants";
import { useDrawdown } from "../../contexts/drawdown";
import { usePriceData } from "../../contexts/price";
import { useTime } from "../../contexts/time";
import { type DatasetList } from "../../types";

export const useCostOfLiving = (): DatasetList => {
  const { priceData } = usePriceData();
  const { costOfLiving, inflation } = useDrawdown();
  const now = useTime();

  return useMemo(() => {
    if (priceData.length === 0) return [];
    const weeklyInflationRate =
      (1 + inflation / 100) ** (1 / WEEKS_PER_YEAR) - 1;
    let weeklyCostOfLiving = costOfLiving / WEEKS_PER_YEAR;
    const dataPoints = Array.from(
      { length: priceData[0]?.length ?? 0 },
      (_, index) => {
        if (index !== 0) weeklyCostOfLiving *= 1 + weeklyInflationRate;
        const x = now + index * MS_PER_WEEK;
        const y = weeklyCostOfLiving * WEEKS_PER_YEAR;
        return { x, y };
      },
    );

    return [
      {
        borderColor: "magenta",
        borderDash: [5, 5],
        borderWidth: 1,
        data: dataPoints,
        label: `Weekly Adjusted Expenses, Annualized`,
        pointRadius: 0,
        tension: 0,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costOfLiving, inflation, (priceData[0] ?? []).length]);
};
