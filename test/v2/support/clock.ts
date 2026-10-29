import type { Timers } from "../../../src/v2/design/primitives/NumberField/settle";

/** A manual clock: timers fire only when the test advances time; `live` counts what is pending. */
export const clock = (): { timers: Timers; advance: (ms: number) => void; live: () => number } => {
  let now = 0;
  let next = 1;
  const due = new Map<number, { at: number; run: () => void }>();
  return {
    timers: {
      set: (run, ms) => {
        due.set(next, { at: now + ms, run });
        return next++;
      },
      clear: (id) => {
        due.delete(id);
      },
    },
    advance: (ms) => {
      now += ms;
      for (const [id, t] of due) {
        if (t.at > now) continue;
        due.delete(id);
        t.run();
      }
    },
    live: () => due.size,
  };
};
