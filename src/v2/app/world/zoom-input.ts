/**
 * V32-BUILD §1T inputs, as native listeners on the plot (G4: no handlers on plain JSX elements).
 * Wheel or pinch zooms at the pointer; Shift+wheel, horizontal scroll or a drag pans (the page
 * shows the grabbing cursor while it does); two fingers pinch; double-click resets; the keys
 * + − ← → 0 zoom, pan and reset while the plot has focus.
 */
import { fullView, isZoomed, panBy, type View, zoomAt } from "./zoom";

export type ZoomTarget = {
  /** The window now, and the horizon's last sample (0 while there is nothing to zoom). */
  view: () => View;
  last: () => number;
  set: (view: View) => void;
  /** The plot's left and right edges in client px. */
  plot: () => { left: number; right: number };
  /** <html>: takes cursor: grabbing for a pan. */
  root: {
    style: { setProperty: (k: string, v: string) => void; removeProperty: (k: string) => void };
  };
};

/** One notch of a mouse wheel (100px of deltaY) zooms by this factor. */
const WHEEL_STEP = 1.25;
/** A trackpad pinch arrives as ctrl+wheel in small deltas: zoom faster per px. */
const PINCH_PER_PX = 0.01;
/** + / − zoom by this factor; ← / → pan by this share of the window. */
export const KEY_ZOOM = 1.5;
export const KEY_PAN = 0.1;

type WheelLike = {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  clientX: number;
};

const LINE_PX = 16;

/** The window after one wheel event (pure). */
export const wheelView = (
  view: View,
  last: number,
  e: WheelLike,
  plot: { left: number; right: number },
): View => {
  const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? plot.right - plot.left : 1;
  const dx = e.deltaX * unit;
  const dy = e.deltaY * unit;
  const width = Math.max(1, plot.right - plot.left);
  const span = view.to - view.from;
  if (!e.ctrlKey && (e.shiftKey || Math.abs(dx) > Math.abs(dy))) {
    const along = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    return panBy(view, (along / width) * span, last);
  }
  const factor = e.ctrlKey ? Math.exp(dy * PINCH_PER_PX) : WHEEL_STEP ** (dy / 100);
  return zoomAt(view, factor, (e.clientX - plot.left) / width, last);
};

/** The window after a key, or null when the key is not one of + − ← → 0 (pure). */
export const keyView = (view: View, last: number, key: string): View | null => {
  const span = view.to - view.from;
  if (key === "+" || key === "=") return zoomAt(view, 1 / KEY_ZOOM, 0.5, last);
  if (key === "-" || key === "_" || key === "\u2212") return zoomAt(view, KEY_ZOOM, 0.5, last);
  if (key === "ArrowLeft") return panBy(view, -span * KEY_PAN, last);
  if (key === "ArrowRight") return panBy(view, span * KEY_PAN, last);
  if (key === "0") return fullView(last);
  return null;
};

type Point = { x: number; y: number };

/** The window during a drag or pinch, from where it started (pure). */
export const gestureView = (
  start: View,
  last: number,
  from: readonly Point[],
  now: readonly Point[],
  plot: { left: number; right: number },
): View => {
  const width = Math.max(1, plot.right - plot.left);
  const span = start.to - start.from;
  const [a0, b0] = from;
  const [a1, b1] = now;
  if (a0 === undefined || a1 === undefined) return start;
  if (b0 === undefined || b1 === undefined)
    return panBy(start, (-(a1.x - a0.x) / width) * span, last);
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  const mid0 = (a0.x + b0.x) / 2;
  const mid1 = (a1.x + b1.x) / 2;
  const zoomed = zoomAt(start, d1 > 0 ? d0 / d1 : 1, (mid0 - plot.left) / width, last);
  return panBy(zoomed, (-(mid1 - mid0) / width) * (zoomed.to - zoomed.from), last);
};

type Ev = Event &
  Partial<WheelLike> & { pointerId?: number; clientY?: number; button?: number; key?: string };
type Plot = EventTarget & {
  setPointerCapture?: (id: number) => void;
};

const num = (v: number | undefined): number => v ?? 0;

/** Wires the plot; returns the detach. */
export const attachZoom = (el: Plot, t: ZoomTarget): (() => void) => {
  const down = new Map<number, Point>();
  let from: Point[] = [];
  let start: View = t.view();
  const grab = (on: boolean): void => {
    if (on) t.root.style.setProperty("cursor", "var(--cursor-drag)");
    else t.root.style.removeProperty("cursor");
  };
  const restart = (): void => {
    from = [...down.values()];
    start = t.view();
  };
  const onWheel = (e: Ev): void => {
    if (!(t.last() > 0)) return;
    e.preventDefault();
    t.set(
      wheelView(
        t.view(),
        t.last(),
        {
          deltaX: num(e.deltaX),
          deltaY: num(e.deltaY),
          deltaMode: num(e.deltaMode),
          shiftKey: e.shiftKey === true,
          ctrlKey: e.ctrlKey === true,
          clientX: num(e.clientX),
        },
        t.plot(),
      ),
    );
  };
  const onDown = (e: Ev): void => {
    if (!(t.last() > 0) || num(e.button) !== 0 || e.pointerId === undefined) return;
    down.set(e.pointerId, { x: num(e.clientX), y: num(e.clientY) });
    try {
      el.setPointerCapture?.(e.pointerId);
    } catch {
      // A pointer the browser no longer tracks: the moves still arrive on the plot.
    }
    restart();
    if (down.size === 1 && isZoomed(start, t.last())) grab(true);
  };
  const onMove = (e: Ev): void => {
    if (e.pointerId === undefined || !down.has(e.pointerId)) return;
    down.set(e.pointerId, { x: num(e.clientX), y: num(e.clientY) });
    if (down.size === 1 && !isZoomed(start, t.last())) return;
    e.preventDefault();
    t.set(gestureView(start, t.last(), from, [...down.values()], t.plot()));
  };
  const onUp = (e: Ev): void => {
    if (e.pointerId === undefined || !down.delete(e.pointerId)) return;
    restart();
    if (down.size === 0) grab(false);
  };
  const onDouble = (): void => {
    if (t.last() > 0) t.set(fullView(t.last()));
  };
  const onKey = (e: Ev): void => {
    if (!(t.last() > 0) || e.key === undefined) return;
    const next = keyView(t.view(), t.last(), e.key);
    if (next === null) return;
    e.preventDefault();
    t.set(next);
  };
  const listeners: [string, (e: Ev) => void][] = [
    ["wheel", onWheel],
    ["pointerdown", onDown],
    ["pointermove", onMove],
    ["pointerup", onUp],
    ["pointercancel", onUp],
    ["dblclick", onDouble],
    ["keydown", onKey],
  ];
  for (const [type, fn] of listeners) el.addEventListener(type, fn, { passive: false });
  return () => {
    for (const [type, fn] of listeners) el.removeEventListener(type, fn);
    grab(false);
  };
};

/**
 * The ZoomTarget for a plot element: reads the live window through `state`, stores a full window
 * as null, and finds the plot's edges from the element's box (`edges`: plotBox's L and R).
 */
export const plotTarget = (
  el: { getBoundingClientRect: () => { left: number; width: number; height: number } },
  state: { current: { view: View; last: number } },
  store: (view: View | null) => void,
  edges: (width: number, height: number) => { L: number; R: number },
  root: ZoomTarget["root"],
): ZoomTarget => ({
  view: () => state.current.view,
  last: () => state.current.last,
  set: (next) => {
    store(isZoomed(next, state.current.last) ? next : null);
  },
  plot: () => {
    const r = el.getBoundingClientRect();
    const b = edges(r.width, r.height);
    return { left: r.left + b.L, right: r.left + b.R };
  },
  root,
});
