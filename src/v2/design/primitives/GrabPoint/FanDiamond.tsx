import type { JSX } from "react";

/**
 * The v32 fan-diamond (hDia()), rotated 90° clockwise in the source (§1L.1): a diamond with fan
 * lines from the LEFT point opening to the right, the way the chart fans out over time. --accent
 * 1.2px stroke on --surface. Decorative (the parent names the control); it fills its wrapper's box.
 */
export const FanDiamond = (): JSX.Element => {
  const S = 26;
  const c = 13;
  const fans: Array<[number, number]> = [];
  // v32's upper-edge points (fans from the bottom point), each turned 90° clockwise about the
  // centre: (x, y) → (S − y, x). The origin (c, S) becomes the left point (0, c).
  const upright: Array<[number, number]> = [];
  for (const t of [0.25, 0.5, 0.75]) upright.push([c * t, c - c * t], [S - c * t, c - c * t]);
  upright.push([c, 0]);
  for (const [x, y] of upright) fans.push([S - y, x]);
  return (
    <svg viewBox={`-1 -1 ${S + 2} ${S + 2}`} focusable="false" aria-hidden="true">
      <path
        d={`M${c} 0 L${S} ${c} L${c} ${S} L0 ${c} Z`}
        fill="var(--surface)"
        stroke="var(--accent)"
        strokeWidth="1.2"
        strokeLinejoin="miter"
      />
      {fans.map(([x, y]) => (
        <line
          key={`${x}-${y}`}
          x1={0}
          y1={c}
          x2={x}
          y2={y}
          stroke="var(--accent)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
};
