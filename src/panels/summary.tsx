import { useMemo } from "react";

import { MS_PER_WEEK } from "../constants";
import { useDrawdown } from "../contexts/drawdown";
import { useModel } from "../contexts/model";
import { usePriceData } from "../contexts/price";
import { useTime } from "../contexts/time";
import { useVolumeData } from "../contexts/volume";
import { useCostOfLiving } from "../data/datasets/cost-of-living";
import { useMinArray } from "../data/datasets/min-array";

const Summary = (): JSX.Element => {
  const { average, loadingVolumeData, median, zero } = useVolumeData();
  const { bitcoin, costOfLiving, drawdownDate, inflation } = useDrawdown();
  const { model, samples, walk } = useModel();
  const now = useTime();
  const minArray = useMinArray();
  const { priceData } = usePriceData();
  const costOfLivingDataset = useCostOfLiving();

  const expired = new Date(now + minArray.length * MS_PER_WEEK)
    .toDateString()
    .slice(-4);

  const escapeVelocity = useMemo(
    () =>
      loadingVolumeData || samples === 0 ? (
        <div className="loader" />
      ) : (
        `${(100 - (zero / samples) * 100).toFixed(2)}% chance of not exhausting bitcoin holdings ${expired === "" ? expired : "by " + expired}
        with an average of ${Number.isNaN(average) || average === undefined ? bitcoin : average.toFixed(4)} Bitcoin left
        (median ${Number.isNaN(median) || median === undefined ? bitcoin : median.toFixed(4)}),
        if drawing down weekly from a ${bitcoin} bitcoin balance,
        starting ${new Date(drawdownDate).toDateString()},
        to meet $${costOfLiving.toLocaleString()} of yearly costs (in todays dollars),
        expecting ${inflation}% inflation per year,
        assuming ${model} modeling and a ${walk} walk strategy.`
      ),
    [
      loadingVolumeData,
      zero,
      expired,
      average,
      bitcoin,
      median,
      drawdownDate,
      costOfLiving,
      inflation,
      model,
      walk,
      samples,
    ],
  );

  const bitcoinWorth =
    (Number.isNaN(average) || average === undefined ? bitcoin : average) *
    (priceData[0]?.at(-1) ?? 0);

  const balanceWorth = useMemo(
    () =>
      loadingVolumeData || samples === 0 ? (
        <div />
      ) : (
        `Remaining average worth $${bitcoinWorth.toLocaleString()}
        in ${expired} dollars
        ($${((costOfLiving / (costOfLivingDataset[0].data.at(-1)?.y ?? 0)) * bitcoinWorth).toLocaleString()} in ${new Date().toDateString().slice(-4)} dollars).`
      ),
    [
      bitcoinWorth,
      costOfLiving,
      costOfLivingDataset,
      expired,
      loadingVolumeData,
      samples,
    ],
  );

  return (
    <div className="center-text">
      <span>{escapeVelocity}</span>
      <span>{balanceWorth}</span>
    </div>
  );
};

export default Summary;
