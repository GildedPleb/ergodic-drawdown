// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { WEEKS_PER_EPOCH } from "../../constants";
import { type IWalk } from "../../types";

export const shark: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0.5,
  startWeek = 0,
  volatility = 0.07,
}) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;
  let expoState = 1.05;
  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    currentValue *= expoState;
    currentValue += randomComponent;

    if (currentValue >= 1) {
      currentValue = 2 - currentValue;
      expoState = 0.95;
    } else if (currentValue <= 0.001) {
      currentValue = -currentValue;
      expoState = 1.05;
    }

    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }
  return data;
};
