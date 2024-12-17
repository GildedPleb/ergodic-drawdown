// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { WEEKS_PER_EPOCH } from "../../constants";
import { type IWalk } from "../../types";

export const bubble: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startWeek = 0,
  volatility = 0.07,
}) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;
  let currentPhase = "ascent";
  let velocity = 0;
  const acceleration = 0.0005;

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    switch (currentPhase) {
      case "base": {
        currentValue += randomComponent;
        break;
      }
      case "ascent": {
        currentValue += velocity + randomComponent;
        velocity += acceleration;
        if (currentValue >= 1) currentPhase = "descent";
        break;
      }
      case "descent": {
        currentValue -= Math.abs(velocity) + randomComponent;
        velocity -= acceleration;
        if (currentValue <= 0) {
          currentPhase = "base";
          velocity = 0;
        }
        break;
      }
    }
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;
    data[week] = currentValue;
  }
  return data;
};
