/**
 * U1 Undo history (V32-BUILD U1, MVP-SPEC Phase 4): a pure, session-only past/future stack over
 * any value type. Keel ruling (2026-10-29): its own module, pure (no React, no store), generic
 * with the equality passed in; AppShell owns only the wiring and the property tests are its
 * contract.
 *
 * - `commit` closes one step: the value before it (or before the live gesture it ends) goes on
 *   the past, capped at `cap`; the redo steps are cleared. A commit equal to that value pushes
 *   nothing and keeps the redo steps.
 * - `preview` marks a live gesture (a slider drag, a held key): the value before it is kept as
 *   the step's start, and nothing is pushed until the gesture's final commit.
 * - `undo` / `redo` move one step and return the value to show; at either end they change nothing.
 */
export type History<T> = {
  readonly past: readonly T[];
  readonly future: readonly T[];
  /** The value before the live gesture in progress, or null. */
  readonly open: T | null;
};

type Moved<T> = { history: History<T>; value: T };

export type HistoryOps<T> = {
  empty: History<T>;
  preview: (h: History<T>, before: T) => History<T>;
  commit: (h: History<T>, before: T, after: T) => History<T>;
  undo: (h: History<T>, current: T) => Moved<T>;
  redo: (h: History<T>, current: T) => Moved<T>;
};

/** Product ruling (Stack Math): at most 50 committed steps (Form: at least 20). */
export const HISTORY_CAP = 50;

export const createHistory = <T>(
  eq: (a: T, b: T) => boolean,
  cap: number = HISTORY_CAP,
): HistoryOps<T> => {
  const empty: History<T> = { past: [], future: [], open: null };
  return {
    empty,
    preview: (h, before) => (h.open === null ? { ...h, open: before } : h),
    commit: (h, before, after) => {
      const start = h.open ?? before;
      if (eq(start, after)) return h.open === null ? h : { ...h, open: null };
      return { past: [...h.past, start].slice(-cap), future: [], open: null };
    },
    undo: (h, current) => {
      const value = h.past.at(-1);
      if (value === undefined) return { history: h, value: current };
      return {
        history: { past: h.past.slice(0, -1), future: [current, ...h.future], open: null },
        value,
      };
    },
    redo: (h, current) => {
      const [value, ...future] = h.future;
      if (value === undefined) return { history: h, value: current };
      return { history: { past: [...h.past, current].slice(-cap), future, open: null }, value };
    },
  };
};
