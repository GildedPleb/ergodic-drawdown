// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { WEEKS_PER_EPOCH } from "../../constants";
import { type IWalk } from "../../types";

const weeksPerPhase = WEEKS_PER_EPOCH / 4;
const acceleration = 0.0005;
const maxVelocity = acceleration * weeksPerPhase;

type Phase = "ascent" | "base" | "descent";

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
  const phase = startWeek / weeksPerPhase;
  let currentPhase: Phase =
    phase < 1 ? "ascent" : phase < 3 ? "descent" : "base";

  let velocity =
    currentPhase === "ascent"
      ? startWeek * acceleration
      : currentPhase === "descent"
        ? maxVelocity - acceleration * (startWeek - weeksPerPhase)
        : 0;

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    switch (currentPhase) {
      case "base": {
        currentValue += randomComponent;
        if (currentValue < 0.3) currentValue += 0.01;
        if (currentValue > 0.1) currentValue -= 0.01;

        break;
      }
      case "ascent": {
        currentValue += velocity + randomComponent;
        velocity += acceleration;
        if (currentValue >= 1) {
          velocity = maxVelocity / 3;
          currentPhase = "descent";
        }
        break;
      }
      case "descent": {
        currentValue -= Math.abs(velocity) + randomComponent;
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
