/**
 * U1 (V32-BUILD:860 (3)): the restored field's tween after an undo or redo. Visual only: the value
 * is committed once, before the tween starts, and the tween only calls `show` (the field's number
 * and slider thumb), so the engine recomputes once per undo, never per frame.
 */
export type Frames = {
  now: () => number;
  next: (run: () => void) => number;
  stop: (id: number) => void;
};

/** Ease out (cubic): the value moves fast, then settles on `to`. */
export const tweenAt = (from: number, to: number, t: number): number =>
  t >= 1 ? to : from + (to - from) * (1 - (1 - t) ** 3);

/** Show `from` → `to` over `ms`, one `show` per frame, ending on exactly `to`; returns a stop. */
export const tween = (
  from: number,
  to: number,
  ms: number,
  show: (n: number) => void,
  frames: Frames,
): (() => void) => {
  const start = frames.now();
  let id = 0;
  const tick = (): void => {
    const t = Math.min(1, (frames.now() - start) / ms);
    show(tweenAt(from, to, t));
    if (t < 1) id = frames.next(tick);
  };
  show(from);
  id = frames.next(tick);
  return () => {
    frames.stop(id);
  };
};

/** The tween's length from `--dur-undo` (0 under reduced motion, so no tween). */
export const undoMs = (root: Element): number =>
  Number.parseFloat(getComputedStyle(root).getPropertyValue("--dur-undo")) || 0;

/** Whether any of `el` shows: inside the viewport and every clipping ancestor (else no tween). */
export const onScreen = (el: Element | null): boolean => {
  if (el === null) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  let box = { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };
  for (let p = el.parentElement; p !== null; p = p.parentElement) {
    if (getComputedStyle(p).overflowY === "visible") continue;
    const c = p.getBoundingClientRect();
    box = {
      top: Math.max(box.top, c.top),
      left: Math.max(box.left, c.left),
      bottom: Math.min(box.bottom, c.bottom),
      right: Math.min(box.right, c.right),
    };
  }
  return r.bottom > box.top && r.top < box.bottom && r.right > box.left && r.left < box.right;
};
