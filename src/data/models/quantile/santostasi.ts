import memoize from "memoizee";

import { genesisDayOne } from "./regression";

const floorLevel = 0.05;
const ceilingLevel = 0.95;

const lines = memoize(() => ({
  ceiling: genesisDayOne.fitPower(ceilingLevel),
  floor: genesisDayOne.fitPower(floorLevel),
}));

export const santostasiPrice = (unixTimeMs: number, ceiling: boolean): number => {
  const fitted = lines();
  return genesisDayOne.price(unixTimeMs, ceiling ? fitted.ceiling : fitted.floor);
};
