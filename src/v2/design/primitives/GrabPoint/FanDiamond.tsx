import type { JSX } from "react";

/**
 * The v32 fan-diamond (hDia()): a diamond with fan lines from the bottom point, --accent 1.2px
 * stroke on --surface. Decorative (the parent names the control); it fills its wrapper's box.
 */
export const FanDiamond = (): JSX.Element => {
  const S = 26;
  const c = 13;
  const fans: Array<[number, number]> = [];
  for (const t of [0.25, 0.5, 0.75]) fans.push([c * t, c - c * t], [S - c * t, c - c * t]);
  fans.push([c, 0]);
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
          x1={c}
          y1={S}
          x2={x}
          y2={y}
          stroke="var(--accent)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
};
