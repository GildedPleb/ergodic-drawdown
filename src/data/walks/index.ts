import { ballOnHill } from "./ball-on-hill";
import { bubble } from "./bubble";
import { fourYearCycle } from "./green-red";
import { USElections } from "./jeb-bush";
import { pingPong } from "./ping-pong";
import { random } from "./random";
import { sawtooth } from "./saw";
import { shark } from "./shark";
import { sinusoidal } from "./sin";

export const walks = {
  Bubble: bubble,
  Momentum: ballOnHill,
  Pong: pingPong,
  Random: random,
  Saw: sawtooth,
  Shark: shark,
  Sin: sinusoidal,
  "Vote Count": USElections,
  "🟢🟢🟢🔴": fourYearCycle,
} as const;

export type WalkTypes = keyof typeof walks;

export const isWalk = (value: string): value is WalkTypes =>
  Object.prototype.hasOwnProperty.call(walks, value);
