import { MAX_EPOCH_COUNT, WEEKS_PER_EPOCH, WEEKS_PER_YEAR } from "./constants";

export const DEFAULT_YEAR_COUNT = 40;

// A year is 52 weeks. The absolute file cap is a full 30-epoch grid.
export const MAX_YEAR_COUNT = (MAX_EPOCH_COUNT * WEEKS_PER_EPOCH) / WEEKS_PER_YEAR;

export const visibleWeeks = (years: number): number => years * WEEKS_PER_YEAR;

// An old plan stored an epoch count. The chart is what remains of that span.
export const legacySpan = (epochs: number, weeksSince: number): number =>
  Math.max(epochs * WEEKS_PER_EPOCH - weeksSince, 1);

export const allocatedEpochs = (weeksSince: number, visible: number): number =>
  Math.min(MAX_EPOCH_COUNT, Math.max(1, Math.ceil((weeksSince + visible) / WEEKS_PER_EPOCH)));

// Chart weeks in the walked columns, including the tail past the visible year.
export const chartWeeksCovered = (weeksSince: number, epochs: number): number =>
  epochs * WEEKS_PER_EPOCH - weeksSince;

// The column that contains this chart week. A column is one walk.
export const columnOfChartWeek = (weeksSince: number, chartWeek: number): number =>
  Math.floor((weeksSince + chartWeek) / WEEKS_PER_EPOCH);

// A new row has never been walked. The watermark is the whole grid, so the row has to
// reach every trusted column even when the requested year is shorter.
export const epochsForNewSamples = (
  weeksSince: number,
  coveredWeeks: number,
  epochCount: number,
  samples: number,
  validHeight: number,
): number => {
  if (validHeight === 0 || samples <= validHeight || coveredWeeks === 0) return epochCount;
  const walked = columnOfChartWeek(weeksSince, coveredWeeks);
  return walked > epochCount ? walked : epochCount;
};

export const maxYears = (weeksSince: number): number => {
  const room = MAX_EPOCH_COUNT * WEEKS_PER_EPOCH - weeksSince;
  return Math.max(1, Math.floor(room / WEEKS_PER_YEAR));
};

export const resolveHorizon = (
  weeksSince: number,
  years: number,
  pinnedWeeks: number | null,
): { dataLength: number; epochs: number } => {
  const room = Math.max(0, MAX_EPOCH_COUNT * WEEKS_PER_EPOCH - weeksSince);
  const requested = pinnedWeeks ?? visibleWeeks(years);
  const dataLength = Math.max(1, Math.min(requested, room > 0 ? room : 1));
  return { dataLength, epochs: allocatedEpochs(weeksSince, dataLength) };
};
