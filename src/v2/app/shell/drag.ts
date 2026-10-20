/**
 * The sheet drag (V32-BUILD §1L.5), pure: sizes are the sheet's height (or the landscape panel's
 * width) in CSS px, velocities are px/ms with + meaning the sheet grows.
 */
export type Stop = "closed" | "half" | "full";

/** Past the closed or full position the sheet moves a third of the pointer's travel. */
export const RUBBER = 1 / 3;
/** A release at this speed or faster snaps in its direction. */
export const FLICK = 0.5;
/** Less movement than this is a tap. */
const TAP = 6;
/** Release velocity looks at this much of the pointer's recent history. */
const WINDOW_MS = 100;
/** The snap spring: settles inside 250ms (an instant set under reduced motion). */
export const SNAP_MS = 240;
export const SNAP_EASE = "cubic-bezier(0.3, 1.3, 0.5, 1)";

export type Sample = { t: number; size: number };

export const rubberBand = (raw: number, min: number, max: number): number => {
  if (raw > max) return max + (raw - max) * RUBBER;
  if (raw < min) return min - (min - raw) * RUBBER;
  return raw;
};

export const isTap = (dx: number, dy: number): boolean => Math.hypot(dx, dy) < TAP;

export const velocity = (samples: readonly Sample[], now: number): number => {
  const recent = samples.filter((s) => now - s.t <= WINDOW_MS);
  const first = recent[0];
  const last = recent.at(-1);
  if (first === undefined || last === undefined || last.t === first.t) return 0;
  return (last.size - first.size) / (last.t - first.t);
};

/** The nearest stop, or after a flick the next stop in the flick's direction. */
export const snapStop = (
  size: number,
  v: number,
  stops: readonly (readonly [Stop, number])[],
): Stop => {
  const sorted = stops.toSorted((a, b) => a[1] - b[1]);
  const lowest = sorted[0];
  const highest = sorted.at(-1);
  if (lowest === undefined || highest === undefined) return "closed";
  if (v >= FLICK) return (sorted.find(([, s]) => s > size) ?? highest)[0];
  if (v <= -FLICK) return (sorted.findLast(([, s]) => s < size) ?? lowest)[0];
  let best = lowest;
  for (const stop of sorted) if (Math.abs(stop[1] - size) < Math.abs(best[1] - size)) best = stop;
  return best[0];
};

/**
 * Opening from a tab: closed opens to the cap (half), anything else closes.
 * Probe m11: the landscape panel (`side`) has one open stop, the one a drag snaps to ("full"), so
 * it's announced the same way however it was opened.
 */
export const toggleStop = (s: Stop, side = false): Stop => {
  if (s !== "closed") return "closed";
  return side ? "full" : "half";
};

export type Dir = "up" | "down";

const ORDER: readonly Stop[] = ["closed", "half", "full"];
const SIDE: readonly Stop[] = ["closed", "full"];

/**
 * V32-BUILD §1R: a tap (or Enter / Space on the grab point) ping-pongs between the stops. Closed
 * always goes to half and full always back to half; half carries on in the last direction. The
 * landscape panel has one open stop, so it just toggles.
 */
export const tapStop = (at: Stop, dir: Dir, side = false): Stop => {
  if (side) return at === "closed" ? "full" : "closed";
  if (at === "half") return dir === "up" ? "full" : "closed";
  return "half";
};

/** §1R: every move (a drag's net movement, a tap, a key) sets the direction; resting keeps it. */
export const dirOf = (from: Stop, to: Stop, dir: Dir): Dir => {
  const by = ORDER.indexOf(to) - ORDER.indexOf(from);
  if (by === 0) return dir;
  return by > 0 ? "up" : "down";
};

/** §1P: the grab point's own keys: ↑/↓ one stop, Home full, End closed; null passes through. */
export const keyStop = (at: Stop, key: string, side = false): Stop | null => {
  const stops = side ? SIDE : ORDER;
  const i = stops.indexOf(at);
  const to: Partial<Record<string, Stop | undefined>> = {
    ArrowUp: stops[Math.min(i + 1, stops.length - 1)],
    ArrowDown: stops[Math.max(i - 1, 0)],
    Home: "full",
    End: "closed",
  };
  return to[key] ?? null;
};

/**
 * The stops a drag snaps between. Item 5 (Form): the bottom sheet's half is the existing cap
 * (46vh phone / 40vh desktop) and full reaches the header; the landscape panel has rail and open.
 */
export const stopsFor = (
  horizontal: boolean,
  closed: number,
  cap: number,
  full: number,
): (readonly [Stop, number])[] =>
  horizontal
    ? [
        ["closed", closed],
        ["full", cap],
      ]
    : [
        ["closed", closed],
        ["half", cap],
        ["full", Math.max(cap, full)],
      ];

export type Gesture = {
  /** The new size once the pointer has moved 6px, else null (still a possible tap). */
  move: (x: number, y: number, t: number) => number | null;
  /** True once the gesture became a drag. */
  readonly dragging: () => boolean;
  /** Where the sheet rests after release (cancel keeps the start); null if it was a tap. */
  release: (t: number, cancelled: boolean) => Stop | null;
};

/** One pointer's drag, from pointerdown at (x, y) with the sheet at `size`. */
export const gesture = (
  start: { x: number; y: number; t: number; size: number; at: Stop },
  horizontal: boolean,
  stops: readonly (readonly [Stop, number])[],
): Gesture => {
  const sizes = stops.map(([, s]) => s);
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  const samples: Sample[] = [{ t: start.t, size: start.size }];
  let size = start.size;
  let dragging = false;
  return {
    move: (x, y, t) => {
      const dx = x - start.x;
      const dy = y - start.y;
      if (!dragging && isTap(dx, dy)) return null;
      dragging = true;
      size = rubberBand(start.size - (horizontal ? dx : dy), min, max);
      samples.push({ t, size });
      if (samples.length > 32) samples.shift();
      return size;
    },
    dragging: () => dragging,
    release: (t, cancelled) => {
      if (!dragging) return null;
      return cancelled ? start.at : snapStop(size, velocity(samples, t), stops);
    },
  };
};
