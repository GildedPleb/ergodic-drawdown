// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { WEEKS_PER_EPOCH } from "../../constants";
import { type IWalk } from "../../types";

export const momentumDrift: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0.5,
  startWeek = 0,
  volatility = 0.07,
}) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;
  let momentum = 0;
  const momentumDecay = 0.9;
  const maxMomentum = 0.03;

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    // Update the momentum with decay and ensure it does not exceed maxMomentum
    momentum = momentum * momentumDecay + randomComponent;
    momentum = Math.max(-maxMomentum, Math.min(maxMomentum, momentum));

    // Apply the current momentum to the current value
    currentValue += momentum;

    // Reflect at boundaries to ensure ergodicity and prevent sticking at edges
    if (currentValue > 1) {
      currentValue = 2 - currentValue;
      momentum = -momentum;
    } else if (currentValue < 0) {
      currentValue = -currentValue;
      momentum = -momentum;
    }

    // Clamp values if specified
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }
  return data;
};
