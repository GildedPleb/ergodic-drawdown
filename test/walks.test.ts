import { expect, test } from "bun:test";

import { WEEKS_PER_EPOCH } from "../src/constants";
import { walks, type WalkTypes } from "../src/data/walks";
import { epochSeed, nextMulberry, WALK_STATE_LENGTH, walkKey } from "../src/data/walks/prng";
import { numberAt } from "../src/number-at";

const start = 0.4;

const callWalk = (
  name: WalkTypes,
  volatility: number,
  state = new Float64Array(WALK_STATE_LENGTH),
  seed = 1,
): Float64Array => {
  const rng = new Uint32Array([seed]);
  return walks[name]({
    clampBottom: true,
    clampTop: true,
    random: () => nextMulberry(rng),
    start,
    startWeek: 0,
    state,
    volatility,
  });
};

const insideClamp = (name: WalkTypes, volatility: number): void => {
  const data = callWalk(name, volatility);

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
    const data = callWalk(expected.name, 0);

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

const stream = (name: WalkTypes, seed: number, epoch: number): (() => number) => {
  const rng = new Uint32Array([epochSeed(seed, walkKey(name), 0, epoch)]);
  return () => nextMulberry(rng);
};

const secondEpoch = (
  name: WalkTypes,
  volatility: number,
  carried: Float64Array,
  seed: number,
): Float64Array => {
  const first = walks[name]({
    clampBottom: false,
    clampTop: false,
    random: stream(name, seed, 0),
    start: 0.5,
    startWeek: 0,
    state: carried,
    volatility,
  });
  // The worker marks the cell occupied. The walk leaves that flag alone.
  carried[2] = 1;
  return walks[name]({
    clampBottom: false,
    clampTop: false,
    random: stream(name, seed, 1),
    start: numberAt(first, WEEKS_PER_EPOCH - 1),
    startWeek: 0,
    state: carried,
    volatility,
  });
};

for (const name of ["Momentum", "Pong", "Shark"] as const) {
  test(`${name} carries its cycle into the next epoch`, () => {
    const seed = name === "Shark" ? 3 : 1;
    const volatility = name === "Pong" ? 0 : 0.1;
    const carried = new Float64Array(WALK_STATE_LENGTH);
    const again = new Float64Array(WALK_STATE_LENGTH);
    const continued = secondEpoch(name, volatility, carried, seed);
    const restarted = secondEpoch(name, volatility, again, seed);
    const dropped = walks[name]({
      clampBottom: false,
      clampTop: false,
      random: stream(name, seed, 1),
      start: numberAt(continued, 0),
      startWeek: 0,
      state: new Float64Array(WALK_STATE_LENGTH),
      volatility,
    });
    let differs = false;
    for (let week = 0; week < WEEKS_PER_EPOCH; week++) {
      expect(numberAt(continued, week)).toBe(numberAt(restarted, week));
      if (!Object.is(numberAt(continued, week), numberAt(dropped, week))) differs = true;
    }
    expect(differs).toBe(true);
    for (let slot = 0; slot < WALK_STATE_LENGTH; slot++) {
      expect(numberAt(carried, slot)).toBe(numberAt(again, slot));
    }
  });
}
