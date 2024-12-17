import { type IWalk } from "../../types";
import { bubble } from "./bubble";
import { USElections } from "./jeb-bush";
import { momentumDrift } from "./momentum";
import { pingPong } from "./ping-pong";
import { random } from "./random";
import { sawtooth } from "./saw";
import { shark } from "./shark";
import { sinusoidal } from "./sin";

export const walks: Record<string, IWalk> = {
  Bubble: bubble,
  Momentum: momentumDrift,
  Pong: pingPong,
  Random: random,
  Saw: sawtooth,
  Shark: shark,
  Sin: sinusoidal,
  "Vote Count": USElections,
} as const;
