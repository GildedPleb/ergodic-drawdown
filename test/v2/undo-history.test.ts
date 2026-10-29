/**
 * U1: history.ts's contract (Keel ruling: the property tests are its contract). Seeded runs over
 * plain numbers, so every sequence is repeatable.
 */
import { expect, test } from "bun:test";

import { createHistory, HISTORY_CAP, type History } from "../../src/v2/app/models/history";

const ops = createHistory<number>((a, b) => a === b);

/** A seeded PRNG (mulberry32): property runs are repeatable. */
const rng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type State = { history: History<number>; value: number };
const SEEDS = 200;

/** One random user action: a commit (sometimes a repeat), a live preview, an undo or a redo. */
const step = (s: State, r: () => number): State => {
  const pick = r();
  if (pick < 0.4) {
    const next = r() < 0.15 ? s.value : Math.floor(r() * 8);
    return { history: ops.commit(s.history, s.value, next), value: next };
  }
  if (pick < 0.55) {
    const next = Math.floor(r() * 8);
    return { history: ops.preview(s.history, s.value), value: next };
  }
  return pick < 0.8 ? ops.undo(s.history, s.value) : ops.redo(s.history, s.value);
};

/** Every state a seeded run passes through, the start included. */
const run = (seed: number, length = 120): State[] => {
  const r = rng(seed);
  const states: State[] = [{ history: ops.empty, value: 0 }];
  for (let i = 0; i < length; i += 1) states.push(step(states.at(-1) ?? states[0]!, r));
  return states;
};

const settled = (s: State): boolean => s.history.open === null;
const same = (a: State, b: State): boolean => JSON.stringify(a) === JSON.stringify(b);
/** One move, then another, from `s`. */
const twice = (s: State, first: "undo" | "redo", then: "undo" | "redo"): State => {
  const m = ops[first](s.history, s.value);
  return ops[then](m.history, m.value);
};
/** Every seeded run, once: each property collects the seeds that break it (expected: none). */
const RUNS = Array.from({ length: SEEDS }, (_, i) => run(i + 1));

test("U1 property: the past never exceeds the cap of 50; redo steps exist only below it", () => {
  expect(HISTORY_CAP).toBe(50);
  // A redo stack only exists after an undo, which shortens the past.
  const bad = RUNS.flat().filter(
    (s) => s.history.past.length > HISTORY_CAP - (s.history.future.length > 0 ? 1 : 0),
  );
  expect(bad).toEqual([]);
});

test("U1 property: undo then redo, and redo then undo, are the identity", () => {
  const states = RUNS.flat().filter(settled);
  const undoable = states.filter((s) => s.history.past.length > 0);
  const redoable = states.filter((s) => s.history.future.length > 0);
  expect(undoable.filter((s) => !same(twice(s, "undo", "redo"), s))).toEqual([]);
  expect(redoable.filter((s) => !same(twice(s, "redo", "undo"), s))).toEqual([]);
  // The runs reach both stacks often enough to mean something.
  expect(Math.min(undoable.length, redoable.length)).toBeGreaterThanOrEqual(1000);
});

test("U1 property: an undo after a commit restores the value before it, from any state", () => {
  const bad = RUNS.flat().filter((s, i) => {
    const next = 100 + (i % 8);
    const committed = ops.commit(s.history, s.value, next);
    return (
      ops.undo(committed, next).value !== (s.history.open ?? s.value) || committed.future.length > 0
    );
  });
  expect(bad).toEqual([]);
});

test("U1 property: at either end undo / redo change nothing", () => {
  const bad = RUNS.flat().filter(
    (s) =>
      (s.history.past.length === 0 && !same(ops.undo(s.history, s.value), s)) ||
      (s.history.future.length === 0 && !same(ops.redo(s.history, s.value), s)),
  );
  expect(bad).toEqual([]);
});

test("U1: a commit equal to the value it starts from pushes nothing and keeps the redo steps", () => {
  const h = ops.commit(ops.commit(ops.empty, 1, 2), 2, 3);
  const back = ops.undo(h, 3);
  expect(ops.commit(back.history, 2, 2)).toBe(back.history);
  expect(back.history.future).toEqual([3]);
});

test("U1 redo: a new commit clears the redo steps", () => {
  const h = ops.commit(ops.commit(ops.empty, 1, 2), 2, 3);
  const back = ops.undo(ops.undo(h, 3).history, 2);
  expect(back).toEqual({ history: { past: [], future: [2, 3], open: null }, value: 1 });
  const fresh = ops.commit(back.history, 1, 9);
  expect(fresh).toEqual({ past: [1], future: [], open: null });
  expect(ops.redo(fresh, 9)).toEqual({ history: fresh, value: 9 });
});

test("U1: a live gesture (previews, then its final commit) is one step back to where it began", () => {
  let h = ops.empty;
  for (const v of [1, 2, 3, 4]) h = ops.preview(h, v - 1);
  expect(h).toEqual({ past: [], future: [], open: 0 });
  h = ops.commit(h, 4, 5);
  expect(h).toEqual({ past: [0], future: [], open: null });
  // A gesture that ends where it began closes with no step.
  expect(ops.commit(ops.preview(h, 5), 6, 5)).toEqual(h);
});

test("U1: the cap keeps the newest 50 steps", () => {
  let h = ops.empty;
  for (let v = 0; v < 60; v += 1) h = ops.commit(h, v, v + 1);
  expect(h.past.length).toBe(50);
  expect(h.past[0]).toBe(10);
  expect(h.past.at(-1)).toBe(59);
  const small = createHistory<number>((a, b) => a === b, 2);
  expect(small.commit(small.commit(small.commit(small.empty, 0, 1), 1, 2), 2, 3).past).toEqual([
    1, 2,
  ]);
});
