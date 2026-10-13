import { WEEKS_PER_EPOCH } from "../../constants";
import type { IWalk } from "../../types";

let expoState = 1.025;

export const shark: IWalk = ({ clampBottom, clampTop, start, startWeek, volatility }) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    currentValue *= expoState;
    currentValue += randomComponent;

    if (currentValue >= 1 + volatility * 10 * Math.random() || (clampTop && currentValue > 1)) {
      expoState = 0.975;
    } else if (currentValue <= 0.001) {
      currentValue = -currentValue;
      expoState = 1.025;
    }

    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }
  return data;
};
