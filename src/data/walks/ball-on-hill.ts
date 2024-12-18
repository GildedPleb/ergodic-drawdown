import { WEEKS_PER_EPOCH } from "../../constants";
import { type IWalk } from "../../types";

let currentVelocity = 0;
let isKicked = false;
let leftKickerPosition = 0;
let rightKickerPosition = 1;

export const ballOnHill: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0.5,
  startWeek = 0,
  volatility = 0.1,
}) => {
  const kickerRange = volatility * 2;

  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;

  // Set kicker positions based on clamping
  leftKickerPosition = clampBottom
    ? (leftKickerPosition = 0)
    : (leftKickerPosition = -Math.random() * kickerRange);
  rightKickerPosition = clampTop
    ? (rightKickerPosition = 1)
    : (rightKickerPosition = 1 + Math.random() * kickerRange);
  if (!isKicked) {
    currentVelocity = (currentValue - 0.5) * 0.01;
  }

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    // Check for kicker hits
    if (
      currentValue <= leftKickerPosition ||
      currentValue >= rightKickerPosition
    ) {
      isKicked = true;

      // Set position to kicker position
      currentValue =
        currentValue <= leftKickerPosition
          ? leftKickerPosition
          : rightKickerPosition;

      // Kick towards 0.5 with velocity proportional to distance from center
      const distanceFromCenter = Math.abs(currentValue - 0.5);
      // Stronger kick when further out
      const kickStrength = 0.02 * (1 + distanceFromCenter);
      currentVelocity = currentValue < 0.5 ? kickStrength : -kickStrength;

      // Set new kicker positions for next time (if not clamped)
      if (!clampBottom) {
        leftKickerPosition = -Math.random() * kickerRange;
      }
      if (!clampTop) {
        rightKickerPosition = 1 + Math.random() * kickerRange;
      }
    }

    if (isKicked) {
      // Decay velocity as we approach 0.5
      currentVelocity *= 0.95;
      if (
        Math.abs(currentValue - 0.5) < 0.01 &&
        Math.abs(currentVelocity) < 0.001
      ) {
        // Reached the top - start falling randomly
        isKicked = false;
        currentVelocity = Math.random() > 0.5 ? 0.001 : -0.001;
      }
    } else {
      // Natural acceleration down the hill
      currentVelocity += (currentValue - 0.5) * 0.01;
    }

    currentValue += currentVelocity + randomComponent;

    // Apply clamps if specified
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }
  return data;
};
