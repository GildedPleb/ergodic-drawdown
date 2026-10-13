import { WEEKS_PER_EPOCH } from "../../constants";
import type { IWalk } from "../../types";

export const sinusoidal: IWalk = ({ clampBottom, clampTop, start, startWeek, volatility }) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;
  let delta = 0.01;

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;
    delta = 0.01 * Math.sin((2 * Math.PI * week) / WEEKS_PER_EPOCH) + randomComponent;
    currentValue += delta;
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;
    data[week] = currentValue;
  }
  return data;
};
