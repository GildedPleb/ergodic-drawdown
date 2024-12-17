// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { WEEKS_PER_EPOCH } from "../../constants";
import { type IWalk } from "../../types";

let currentPingPongPhase: "ascent" | "descent" = "descent";

// WARN: There might be a off-by-one error here, in that data[startWeek] = start, and then immediately overwritten.
export const pingPong: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startWeek = 0,
  volatility = 0.07,
}) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    switch (currentPingPongPhase) {
      case "ascent": {
        currentValue += randomComponent + Math.random() * 0.005;
        if (currentValue >= 1) currentPingPongPhase = "descent";
        break;
      }
      case "descent": {
        currentValue -= randomComponent + Math.random() * 0.005;
        if (currentValue <= 0) currentPingPongPhase = "ascent";
        break;
      }
    }
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }
  return data;
};
