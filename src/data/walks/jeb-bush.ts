import { WEEKS_PER_EPOCH } from "../../constants";
import { type IWalk } from "../../types";

export const USElections: IWalk = ({ clampBottom, clampTop, start, startWeek, volatility }) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;
  const decrement = 0.003;

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    currentValue -= randomComponent + decrement;

    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
    if (currentValue <= 0) {
      currentValue = 1;
    }
  }
  return data;
};
