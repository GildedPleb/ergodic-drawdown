// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { WEEKS_PER_EPOCH } from "../../constants";
import { type IWalk } from "../../types";

export const sawtooth: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startWeek = 0,
  volatility = 0.07,
}) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;
  let increment = 0.01;

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;
    increment = 0.0025 + randomComponent;

    currentValue += increment;

    // Reset at the top and reflect at the bottom to ensure full range coverage
    if (
      currentValue >= 1 + volatility * 100 * Math.random() ||
      (clampTop && currentValue >= 1)
    ) {
      currentValue = clampBottom ? 0 : 0 - volatility * 10 * Math.random();
    }

    // Optionally clamp values if specified
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }
  return data;
};
