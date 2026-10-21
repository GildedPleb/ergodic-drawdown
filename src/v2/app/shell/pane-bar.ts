/**
 * V32-BUILD §1MP 11 (B2-r): the pane draws its own scrollbar, beside the masked zone, so no engine's
 * native bar (Firefox's can't be styled to the spec) sits under the fade. Length and offset follow
 * the native proportional rule; the thumb drags with pointer capture; wheel, touch and keys stay
 * native on the zone.
 */
import type { Frames, Observe } from "./pane-cues";

export type Metrics = { scrollTop: number; scrollHeight: number; clientHeight: number };
export type Thumb = { on: boolean; size: number; offset: number };

/** The thumb's shortest length in rem (a grabbable 24px at 16px). */
export const THUMB_MIN_REM = 1.5;

/** Off when nothing scrolls (a sub-pixel overflow is nothing); otherwise whole-px size and offset. */
export const thumbOf = (m: Metrics, min: number): Thumb => {
  const range = m.scrollHeight - m.clientHeight;
  if (range < 1 || m.clientHeight <= 0) return { on: false, size: 0, offset: 0 };
  const size = Math.min(
    m.clientHeight,
    Math.max(min, Math.round((m.clientHeight * m.clientHeight) / m.scrollHeight)),
  );
  const at = Math.min(1, Math.max(0, m.scrollTop / range));
  return { on: true, size, offset: Math.round((m.clientHeight - size) * at) };
};

/** The scrollTop a thumb drag asks for: the pointer's travel, track to content, clamped. */
export const dragScroll = (start: number, dy: number, m: Metrics, size: number): number => {
  const range = m.scrollHeight - m.clientHeight;
  const travel = m.clientHeight - size;
  if (travel <= 0 || range <= 0) return start;
  return Math.min(range, Math.max(0, start + (dy * range) / travel));
};

type BarZone<E> = Metrics & {
  firstElementChild: E | null;
  addEventListener: (type: "scroll", fn: () => void, opts: { passive: true }) => void;
  removeEventListener: (type: "scroll", fn: () => void) => void;
};
type Bar = {
  hidden: boolean | string;
  style: { setProperty: (name: string, value: string) => void };
};

/** Paints the bar now, then once a frame after any scroll or resize of the zone or its content. */
export const watchBar = <E>(
  zone: (BarZone<E> & E) | null,
  bar: Bar | null,
  min: () => number,
  frames: Frames,
  observe?: Observe<E>,
): (() => void) => {
  if (zone === null || bar === null) return () => undefined;
  let frame = 0;
  const paint = (): void => {
    frame = 0;
    const t = thumbOf(zone, min());
    bar.hidden = !t.on;
    bar.style.setProperty("--dyn-th", `${String(t.size)}px`);
    bar.style.setProperty("--dyn-ty", `${String(t.offset)}px`);
  };
  const schedule = (): void => {
    if (frame === 0) frame = frames.request(paint);
  };
  paint();
  zone.addEventListener("scroll", schedule, { passive: true });
  const els: E[] = [zone];
  if (zone.firstElementChild !== null) els.push(zone.firstElementChild);
  const unobserve = observe?.(els, schedule);
  return () => {
    frames.cancel(frame);
    zone.removeEventListener("scroll", schedule);
    unobserve?.();
  };
};

type Press = { button: number; clientY: number; pointerId: number; preventDefault: () => void };
type DragType = "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
type Grip = {
  addEventListener: (type: DragType, fn: (e: Press) => void) => void;
  removeEventListener: (type: DragType, fn: (e: Press) => void) => void;
  setPointerCapture: (id: number) => void;
};

/** The thumb drags the zone (pointer capture); `hold` keeps the drag cursor and no selection. */
export const dragThumb = (
  grip: Grip | null,
  zone: Metrics | null,
  min: () => number,
  hold: (on: boolean) => void,
): (() => void) => {
  if (grip === null || zone === null) return () => undefined;
  let start: { y: number; top: number; size: number } | null = null;
  const down = (e: Press): void => {
    if (e.button !== 0) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    start = { y: e.clientY, top: zone.scrollTop, size: thumbOf(zone, min()).size };
    hold(true);
  };
  const move = (e: Press): void => {
    if (start !== null)
      zone.scrollTop = dragScroll(start.top, e.clientY - start.y, zone, start.size);
  };
  const up = (): void => {
    if (start === null) return;
    start = null;
    hold(false);
  };
  const on: [DragType, (e: Press) => void][] = [
    ["pointerdown", down],
    ["pointermove", move],
    ["pointerup", up],
    ["pointercancel", up],
  ];
  for (const [type, fn] of on) grip.addEventListener(type, fn);
  return () => {
    for (const [type, fn] of on) grip.removeEventListener(type, fn);
    up();
  };
};
