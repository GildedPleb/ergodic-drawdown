import { WEEKS_PER_EPOCH } from "../../constants";
import { numberAt } from "../../number-at";
import type { IWalk } from "../../types";

export const shark: IWalk = ({
  clampBottom,
  clampTop,
  random,
  start,
  startWeek,
  state,
  volatility,
}) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;
  if (numberAt(state, 2) === 0) state[0] = 1.025;
  let expoState = numberAt(state, 0);

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (random() - 0.5) * volatility;

    currentValue *= expoState;
    currentValue += randomComponent;

    if (currentValue >= 1 + volatility * 10 * random() || (clampTop && currentValue > 1)) {
      expoState = 0.975;
    } else if (currentValue <= 0.001) {
      currentValue = -currentValue;
      expoState = 1.025;
    }

    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }
  state[0] = expoState;
  return data;
};
