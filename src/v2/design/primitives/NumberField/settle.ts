/**
 * Draft-then-commit-on-settle for wheel steps (Probe B1 / FL-002): every notch pokes the timer and
 * only steps the visible draft; the value commits once, WHEEL_SETTLE_MS after the last notch, or
 * at once on blur / Enter (flush), and never after unmount (cancel). Timers are injectable so the
 * commit logic is unit-tested without a browser.
 */

/** Quiet time after the last wheel notch before the draft commits. Fast scrolling sends a notch
 * every 15–50 ms and a deliberate one every ~100–200 ms, so 300 ms reads as "the wheel stopped"
 * without feeling laggy. */
export const WHEEL_SETTLE_MS = 300;

export type Timers = {
  set: (run: () => void, ms: number) => number;
  clear: (id: number) => void;
};

export type Settle = {
  /** A notch: (re)start the quiet timer. */
  poke: () => void;
  /** Commit now if a notch is pending (blur, Enter); true when it committed. */
  flush: () => boolean;
  /** Drop a pending commit (Escape, unmount). */
  cancel: () => void;
  pending: () => boolean;
};

const browserTimers: Timers = {
  set: (run, ms) => window.setTimeout(run, ms),
  clear: (id) => {
    window.clearTimeout(id);
  },
};

export const createSettle = (
  commit: () => void,
  ms: number = WHEEL_SETTLE_MS,
  timers: Timers = browserTimers,
): Settle => {
  let timer: number | null = null;
  const stop = (): boolean => {
    if (timer === null) return false;
    timers.clear(timer);
    timer = null;
    return true;
  };
  return {
    poke: () => {
      stop();
      timer = timers.set(() => {
        timer = null;
        commit();
      }, ms);
    },
    flush: () => {
      if (!stop()) return false;
      commit();
      return true;
    },
    cancel: () => {
      stop();
    },
    pending: () => timer !== null,
  };
};
