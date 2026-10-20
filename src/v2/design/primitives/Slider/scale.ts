/**
 * §1Q focus-range slider: the first BREAK (80%) of the track maps linearly across the field's focus
 * range; the rest maps on a log scale from the focus top to the soft top. Typed values past the
 * soft top are kept; the thumb pins at the right end. Without a focus range the track is linear.
 */
export const BREAK = 0.8;

export type Scale = {
  min: number;
  /** The value at the track's right end (soft top, or the field's max). */
  top: number;
  /** Position 0…1 for a value (pinned at 0 and 1). */
  toPos: (value: number) => number;
  /** The value at position 0…1, snapped to the step (focus range) or a whole step (log part). */
  toValue: (pos: number) => number;
  /** One arrow-key step from a value: the step inside the focus range, ~5% of the value above. */
  stepAt: (value: number, up: boolean) => number;
  /** Where the scale changes (null when linear). */
  breakAt: number | null;
};

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export const snapTo = (n: number, min: number, step: number): number => {
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Number((min + Math.round((n - min) / step) * step).toFixed(decimals));
};

export const linearScale = (min: number, max: number, step: number): Scale => ({
  min,
  top: max,
  toPos: (v) => (max > min ? clamp01((v - min) / (max - min)) : 0),
  toValue: (pos) =>
    Math.min(max, Math.max(min, snapTo(min + clamp01(pos) * (max - min), min, step))),
  stepAt: () => step,
  breakAt: null,
});

export type FocusRange = { focusTop: number; softTop: number; step: number };

export const focusScale = (min: number, { focusTop, softTop, step }: FocusRange): Scale => {
  const span = focusTop - min;
  const ratio = Math.log(softTop / focusTop);
  return {
    min,
    top: softTop,
    toPos: (v) => {
      if (v <= focusTop) return clamp01(((v - min) / span) * BREAK);
      if (v >= softTop) return 1;
      return BREAK + ((1 - BREAK) * Math.log(v / focusTop)) / ratio;
    },
    toValue: (raw) => {
      const pos = clamp01(raw);
      if (pos <= BREAK) return Math.min(focusTop, snapTo(min + (pos / BREAK) * span, min, step));
      if (pos === 1) return softTop;
      const v = focusTop * Math.exp(((pos - BREAK) / (1 - BREAK)) * ratio);
      return Math.min(softTop, Math.max(focusTop, snapTo(v, min, step)));
    },
    stepAt: (v, up) =>
      (up ? v < focusTop : v <= focusTop) ? step : Math.max(step, snapTo(v * 0.05, 0, step)),
    breakAt: BREAK,
  };
};
