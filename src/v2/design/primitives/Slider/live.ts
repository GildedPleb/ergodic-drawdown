/**
 * Probe M2 (§1P, user rule: every shown value is real): a slider drag or held slider key commits
 * live, exactly like a held NumberField step (throttle.ts): the first move at once, then at most
 * every HELD_COMMIT_MS with the latest value, and once more on release. A value already sent is
 * never sent twice, except that the release always ends a live gesture with one final commit
 * (U1: `live` false closes one undo step); cancel drops what's pending. The Slider's value cell
 * then follows the thumb.
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
  commit: (n: number, live: boolean) => void,
  current: () => number,
  timers?: Timers,
): Live => {
  let latest = Number.NaN;
  let sent: number | null = null;
  // A live commit went out and its gesture hasn't had its final one yet.
  let open = false;
  const send = (final: boolean): void => {
    if (Number.isNaN(latest)) return;
    if (latest === (sent ?? current())) {
      if (!final || !open) return;
    } else sent = latest;
    open = !final;
    commit(latest, !final);
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
    cancel: () => {
      open = false;
      hold.cancel();
    },
    settled: () => {
      sent = null;
    },
  };
};
