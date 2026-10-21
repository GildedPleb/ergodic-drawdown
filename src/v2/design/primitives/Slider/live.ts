/**
 * Probe M2 (§1P, user rule: every shown value is real): a slider drag or held slider key commits
 * live, exactly like a held NumberField step (throttle.ts): the first move at once, then at most
 * every HELD_COMMIT_MS with the latest value, and once more on release. A value already sent is
 * never sent twice; cancel drops what's pending. The Slider's value cell then follows the thumb.
 */
import type { Timers } from "../NumberField/settle";
import { createThrottle } from "../NumberField/throttle";

export type Live = {
  /** The thumb moved (pointer or key): show it, and commit live. */
  move: (n: number) => void;
  /** Pointer up, key up, blur: commit the last value once. */
  release: (n: number) => void;
  /** Pointer cancel, unmount: commit nothing more. */
  cancel: () => void;
  /** The committed value changed from outside; a repeat of it is a new commit again. */
  settled: () => void;
};

export const createLive = (
  commit: (n: number) => void,
  current: () => number,
  timers?: Timers,
): Live => {
  let latest = Number.NaN;
  let sent: number | null = null;
  const send = (): void => {
    if (Number.isNaN(latest) || latest === (sent ?? current())) return;
    sent = latest;
    commit(latest);
  };
  const hold = createThrottle(send, undefined, timers);
  return {
    move: (n) => {
      latest = n;
      hold.poke();
    },
    release: (n) => {
      latest = n;
      hold.release();
    },
    cancel: hold.cancel,
    settled: () => {
      sent = null;
    },
  };
};
