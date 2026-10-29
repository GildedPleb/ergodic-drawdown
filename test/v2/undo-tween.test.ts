/**
 * U1 (V32-BUILD:860 (3)): the restored field tweens over --dur-undo, visual only. An undo commits
 * its value once (one recompute); the tween's frames only touch what the field shows.
 */
import { expect, test } from "bun:test";

import { createHistory } from "../../src/v2/app/models/history";
import { stepOf } from "../../src/v2/app/models/ModelsSheet";
import { tween, tweenAt, type Frames } from "../../src/v2/app/models/tween";
import { defaultModelsValues, type ModelsValues } from "../../src/v2/app/models/values";

const fakeFrames = (): Frames & { flush: () => number } => {
  let t = 0;
  let queue: (() => void)[] = [];
  return {
    now: () => t,
    next: (run) => queue.push(run),
    stop: () => {
      queue = [];
    },
    flush: () => {
      let frames = 0;
      while (queue.length > 0) {
        t += 16;
        const due = queue;
        queue = [];
        for (const run of due) run();
        frames += 1;
      }
      return frames;
    },
  };
};

test("U1: each undo recomputes once; its tween shows many frames and lands on the value", () => {
  const ops = createHistory<ModelsValues>((a, b) => stepOf(a, b) === null);
  const base = defaultModelsValues();
  // The engine recomputes when the committed values change identity (useWorld's memo).
  let values = base;
  let recomputes = 0;
  const commit = (next: ModelsValues): void => {
    if (next !== values) recomputes += 1;
    values = next;
  };
  let history = ops.empty;
  for (const years of [30, 20]) {
    const next = { ...values, years };
    history = ops.commit(history, values, next);
    commit(next);
  }
  for (const way of ["undo", "undo", "redo"] as const) {
    const before = recomputes;
    const was = values.years;
    const r = ops[way](history, values);
    history = r.history;
    commit(r.value);
    const shown: number[] = [];
    const frames = fakeFrames();
    tween(was, values.years, 200, (n) => shown.push(n), frames);
    const count = frames.flush();
    expect(recomputes - before).toBe(1);
    expect(count).toBeGreaterThanOrEqual(12);
    expect(shown[0]).toBe(was);
    expect(shown.at(-1)).toBe(values.years);
  }
});

test("U1: the tween eases out and a stop ends it before it shows again", () => {
  expect(tweenAt(0, 10, 0)).toBe(0);
  expect(tweenAt(0, 10, 0.5)).toBe(8.75);
  expect(tweenAt(0, 10, 1)).toBe(10);
  const frames = fakeFrames();
  const shown: number[] = [];
  const stop = tween(0, 10, 200, (n) => shown.push(n), frames);
  stop();
  expect(frames.flush()).toBe(0);
  expect(shown).toEqual([0]);
});
