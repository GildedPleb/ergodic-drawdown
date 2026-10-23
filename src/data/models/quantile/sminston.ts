import memoize from "memoizee";

import { sinceGenesis } from "./regression";

const floorLevel = 0.01;
const ceilingLevel = 0.99;

const lines = memoize(() => ({
  ceiling: sinceGenesis.fitPower(ceilingLevel),
  floor: sinceGenesis.fitPower(floorLevel),
}));

export const sminstonPrice = (unixTimeMs: number, ceiling: boolean): number => {
  const fitted = lines();
  return sinceGenesis.price(unixTimeMs, ceiling ? fitted.ceiling : fitted.floor);
};
