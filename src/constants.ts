export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MS_PER_WEEK = 7 * MS_PER_DAY;
export const MS_PER_YEAR = 365 * MS_PER_DAY;

export const BLOCKS_PER_HOUR = 6;
export const BLOCKS_PER_WEEK = 7 * 24 * BLOCKS_PER_HOUR;
export const BLOCKS_PER_YEAR = 365 * 24 * BLOCKS_PER_HOUR;
export const HALVING_INTERVAL = 210_000;

export const WEEKS_PER_YEAR = 52;
export const WEEKS_PER_EPOCH = 4 * WEEKS_PER_YEAR;

export const LAST_SAVED_TIMESTAMP = 1_719_014_400;

// eslint-disable-next-line functional/functional-parameters
export const isMobile = (): boolean => {
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    return (
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768
    );
  }
  return false;
};
