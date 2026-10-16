import type { WalkTypes } from "./index";

// Slot 2 stays 1 after a walk runs. A cell whose last float is 0 reads as empty,
// and a real cycle flag (Pong descending, Momentum not kicked) is 0.
export const WALK_STATE_LENGTH = 3;

const walkKeys: Record<WalkTypes, number> = {
  Bubble: 1,
  Momentum: 2,
  Pong: 3,
  Random: 4,
  Saw: 5,
  Shark: 6,
  Sin: 7,
  "Vote Count": 8,
  "🟢🟢🟢🔴": 9,
};

export const walkKey = (walk: WalkTypes): number => walkKeys[walk];

const splitmix32 = (value: number): number => {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
};

export const epochSeed = (seed: number, key: number, sample: number, epoch: number): number => {
  let mixed = splitmix32((seed >>> 0) ^ 0x9e3779b9);
  mixed = splitmix32(mixed ^ (key >>> 0));
  mixed = splitmix32(mixed ^ (sample >>> 0));
  mixed = splitmix32(mixed ^ (epoch >>> 0));
  return mixed === 0 ? 0x6d2b79f5 : mixed;
};

export const nextMulberry = (rng: Uint32Array): number => {
  let seed = (rng[0] ?? 0) | 0;
  seed = (seed + 0x6d2b79f5) | 0;
  rng[0] = seed;
  let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
};
