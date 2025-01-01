// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { WEEKS_PER_EPOCH } from "../../constants";
import { type IWalk } from "../../types";

const WEEKS_PER_YEAR = WEEKS_PER_EPOCH / 4;

type Phase = "green" | "red";

export const fourYearCycle: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startWeek = 0,
  volatility = 0.07,
}) => {
  const data = new Float64Array(WEEKS_PER_EPOCH);
  data[startWeek] = start;
  let currentValue = start;

  // Determine initial phase based on which year we're in
  const yearIndex = Math.floor(startWeek / WEEKS_PER_YEAR);
  let currentPhase: Phase = yearIndex === 3 ? "red" : "green";

  // Base trends for each phase
  // Positive trend during green years
  const greenTrend = 0.005;
  // Stronger negative trend during red year
  const redTrend = -0.015;

  for (let week = startWeek + 1; week < WEEKS_PER_EPOCH; week++) {
    // Calculate which year we're in (0-3)
    const currentYear = Math.floor(week / WEEKS_PER_YEAR);

    // Update phase based on year
    currentPhase = currentYear === 3 ? "red" : "green";

    // Add randomness
    const randomComponent = (Math.random() - 0.5) * volatility;
    // Apply trend based on phase
    currentValue +=
      currentPhase === "green"
        ? greenTrend + randomComponent
        : redTrend + randomComponent;
    // Apply clamping if enabled
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data[week] = currentValue;
  }

  return data;
};
