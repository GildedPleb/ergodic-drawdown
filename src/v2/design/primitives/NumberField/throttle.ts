/**
 * Live commits while a step key is held or the wheel is turning (user report, Oct 20; replaces
 * FL-001's commit-on-release for held keys and B1's commit-on-settle for the wheel). The first step
 * commits at once; further steps commit at most once every HELD_COMMIT_MS, with the latest draft;
 * release commits exactly once more (the trailing commit). Steps between ticks are never queued:
 * each tick reads the draft as it is then. Engine side, coalesce.ts keeps one job in flight and
 * drops configs superseded while it runs. Timers are injectable so this is unit-tested.
 */
import type { Timers } from "./settle";

/** Main's number inputs re-render on every held step; v2 re-renders at most this often. */
export const HELD_COMMIT_MS = 100;

export type Throttle = {
  /** A step: commit now if the window is open, else mark the latest draft as due at the tick. */
  poke: () => void;
  /** Release (keyup, wheel settle, blur, Enter): stop ticking and commit exactly once. */
  release: () => void;
  /** Drop everything (Escape, unmount); commits nothing. */
  cancel: () => void;
  /** A tick is scheduled (the hold is live). */
  live: () => boolean;
};

const browserTimers: Timers = {
  set: (run, ms) => window.setTimeout(run, ms),
  clear: (id) => {
    window.clearTimeout(id);
  },
};

export const createThrottle = (
  /** `final` is true only for the release's commit (U1: it closes one undo step). */
  commit: (final: boolean) => void,
  ms: number = HELD_COMMIT_MS,
  timers: Timers = browserTimers,
): Throttle => {
  let timer: number | null = null;
  let due = false;
  const tick = (): void => {
    timer = null;
    if (!due) return;
    due = false;
    commit(false);
    timer = timers.set(tick, ms);
  };
  const stop = (): void => {
    if (timer !== null) timers.clear(timer);
    timer = null;
    due = false;
  };
  return {
    poke: () => {
      if (timer !== null) {
        due = true;
        return;
      }
      commit(false);
      timer = timers.set(tick, ms);
    },
    release: () => {
      stop();
      commit(true);
    },
    cancel: stop,
    live: () => timer !== null,
  };
};
