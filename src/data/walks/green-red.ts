// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { WEEKS_PER_EPOCH, WEEKS_PER_YEAR } from "../../constants";
import { type IWalk } from "../../types";

export const fourYearCycle: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startWeek = 0,
  volatility = 0.07,
}) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;

  // Determine initial phase and rate
  let rate = 0;
  if (startWeek < WEEKS_PER_YEAR) {
    if (start < 1) {
      rate = (1 - start) / (WEEKS_PER_YEAR - startWeek);
    }
  } else if (startWeek < WEEKS_PER_YEAR * 2) {
    if (start > 0) {
      rate = (0 - start) / (WEEKS_PER_YEAR - (startWeek % WEEKS_PER_YEAR));
    }
  } else if (start < 1) {
    rate = (1 - start) / (WEEKS_PER_YEAR * 4 - startWeek);
  }

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    if (week === WEEKS_PER_YEAR && currentValue > 0) {
      rate = (0 - currentValue) / WEEKS_PER_YEAR;
    } else if (week === WEEKS_PER_YEAR * 2 && currentValue < 1) {
      rate = (1 - currentValue) / (WEEKS_PER_YEAR * 3);
    }

    if (rate > 0 && currentValue > 1) rate = 0;
    if (rate < 0 && currentValue < 0) rate = 0;

    currentValue += rate + (Math.random() - 0.5) * volatility;

    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }

  return data;
};
