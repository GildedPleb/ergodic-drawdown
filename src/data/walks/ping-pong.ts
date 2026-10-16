import { WEEKS_PER_EPOCH } from "../../constants";
import { numberAt } from "../../number-at";
import type { IWalk } from "../../types";

const bandPerEpoch = 1 / WEEKS_PER_EPOCH;

export const pingPong: IWalk = ({
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
  // A fresh path already on the floor is heading toward the ceiling.
  if (numberAt(state, 2) === 0) state[0] = start <= 0 ? 1 : 0;
  let phase: "ascent" | "descent" = numberAt(state, 0) === 0 ? "descent" : "ascent";

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    // The shock can pause a week. It cannot walk away from the wall, or the leg never arrives.
    const step = Math.max(bandPerEpoch + (random() - 0.5) * volatility, 0);

    if (phase === "ascent") {
      currentValue += step;
      if (currentValue >= 1) phase = "descent";
    } else {
      currentValue -= step;
      if (currentValue <= 0) phase = "ascent";
    }
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }
  state[0] = phase === "ascent" ? 1 : 0;
  return data;
};
