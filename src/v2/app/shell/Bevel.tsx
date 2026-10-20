import { type JSX, useLayoutEffect, useRef, useState } from "react";

import { type BevelPaths, observeWith, watchBevel } from "./bevel-path";

type BevelProps = {
  className: string;
  /** The landscape side panel: the bevel runs down its left edge. */
  side: boolean;
};

/**
 * V32-BUILD §1X: the sheet's bevelled edge, drawn as SVG over the sheet's own box. The run is
 * stroked at --rule-hair, the diagonals at --bevel-comp, one colour, miter joins.
 */
export const Bevel = ({ className, side }: BevelProps): JSX.Element => {
  const svg = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<BevelPaths | null>(null);

  useLayoutEffect(
    () =>
      watchBevel<Element>(svg.current, side, setPaths, {
        style: getComputedStyle,
        root: document.documentElement,
        observe: observeWith<Element>(
          typeof ResizeObserver === "undefined" ? undefined : ResizeObserver,
        ),
      }),
    [side],
  );

  return (
    <svg ref={svg} className={className} aria-hidden="true" focusable="false">
      <path
        d={paths?.run ?? ""}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="var(--rule-hair)"
        strokeLinejoin="miter"
      />
      <path
        d={paths?.diagonals ?? ""}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="calc(var(--rule-hair) * var(--bevel-comp))"
        strokeLinejoin="miter"
      />
    </svg>
  );
};
