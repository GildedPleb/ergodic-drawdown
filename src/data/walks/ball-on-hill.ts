import { WEEKS_PER_EPOCH } from "../../constants";
import { numberAt } from "../../number-at";
import type { IWalk } from "../../types";

export const ballOnHill: IWalk = ({
  clampBottom,
  clampTop,
  random,
  start,
  startWeek,
  state,
  volatility,
}) => {
  const kickerRange = volatility * 2;

  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;
  if (numberAt(state, 2) === 0) {
    state[0] = 0;
    state[1] = 0;
  }
  let currentVelocity = numberAt(state, 0);
  let isKicked = numberAt(state, 1) !== 0;

  let leftKicker = clampBottom ? 0 : -random() * kickerRange;
  let rightKicker = clampTop ? 1 : 1 + random() * kickerRange;
  if (!isKicked) {
    currentVelocity = (currentValue - 0.5) * 0.01;
  }

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (random() - 0.5) * volatility;

    if (currentValue <= leftKicker || currentValue >= rightKicker) {
      isKicked = true;

      currentValue = currentValue <= leftKicker ? leftKicker : rightKicker;

      const distanceFromCenter = Math.abs(currentValue - 0.5);
      const kickStrength = 0.02 * (1 + distanceFromCenter);
      currentVelocity = currentValue < 0.5 ? kickStrength : -kickStrength;

      if (!clampBottom) {
        leftKicker = -random() * kickerRange;
      }
      if (!clampTop) {
        rightKicker = 1 + random() * kickerRange;
      }
    }

    if (isKicked) {
      currentVelocity *= 0.95;
      if (Math.abs(currentValue - 0.5) < 0.01 && Math.abs(currentVelocity) < 0.001) {
        isKicked = false;
        currentVelocity = random() > 0.5 ? 0.001 : -0.001;
      }
    } else {
      currentVelocity += (currentValue - 0.5) * 0.01;
    }

    currentValue += currentVelocity + randomComponent;

    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }
  state[0] = currentVelocity;
  state[1] = isKicked ? 1 : 0;
  return data;
};
