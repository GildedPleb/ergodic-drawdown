import { expect, test } from "bun:test";

import { WEEKS_PER_EPOCH } from "../src/constants";
import { walks, type WalkTypes } from "../src/data/walks";

const start = 0.4;

const insideClamp = (name: WalkTypes, volatility: number): void => {
  const data = walks[name]({
    clampBottom: true,
    clampTop: true,
    start,
    startWeek: 0,
    volatility,
  });

  expect(data.length).toBe(WEEKS_PER_EPOCH);
  expect(data[0]).toBe(start);
  for (const value of data) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
};

const deterministic: Array<{
  last: number;
  name: WalkTypes;
  week1: number;
  week52: number;
}> = [
  { last: 0.099_999_999_999_999_99, name: "Bubble", week1: 0.4, week52: 0.982_666_666_666_666_6 },
  {
    last: 0.917_499_999_999_991_2,
    name: "Saw",
    week1: 0.4025,
    week52: 0.529_999_999_999_999_5,
  },
  {
    last: 0.337_965_783_539_527_05,
    name: "Sin",
    week1: 0.400_302_030_278_008_9,
    week52: 0.736_017_108_230_236_6,
  },
  {
    last: 0.780_999_999_999_999_8,
    name: "Vote Count",
    week1: 0.397,
    week52: 0.243_999_999_999_999_88,
  },
  {
    last: 0.666_666_666_666_665_4,
    name: "🟢🟢🟢🔴",
    week1: 0.411_538_461_538_461_6,
    week52: 0.969_452_662_721_891_9,
  },
];

for (const expected of deterministic) {
  test(`${expected.name} lands on a fixed path when volatility is 0`, () => {
    const data = walks[expected.name]({
      clampBottom: true,
      clampTop: true,
      start,
      startWeek: 0,
      volatility: 0,
    });

    expect(data[1]).toBe(expected.week1);
    expect(data[52]).toBe(expected.week52);
    expect(data[WEEKS_PER_EPOCH - 1]).toBe(expected.last);
    insideClamp(expected.name, 0);
  });
}

for (const name of ["Momentum", "Pong", "Random", "Shark"] as const) {
  test(`${name} stays inside the clamp`, () => {
    insideClamp(name, 100);
  });
}
