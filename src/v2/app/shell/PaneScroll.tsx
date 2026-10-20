import type { JSX, ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";

import styles from "./PaneScroll.module.css";
import { resizeWith, watchCues } from "./pane-cues";
import type { Pane } from "./panes";

/** R7: the scroll listener's flags (absent = false). */
export const variants = { top: ["true"] as const, more: ["true"] as const };

type PaneScrollProps = { id: Pane; children: ReactNode };

/**
 * V32-BUILD §1Y, every dock pane: the stepped Deco rule under the tab bar (a hairline with a
 * centred 3rem gold bar), the zone below it the only thing that scrolls (hard-clipped at the
 * rule), ▲ on the rule once scrolled and ▼ on a foot rule while more is below. No fades.
 */
export const PaneScroll = ({ id, children }: PaneScrollProps): JSX.Element => {
  const pane = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () =>
      watchCues<Element>(
        zone.current,
        pane.current,
        resizeWith<Element>(typeof ResizeObserver === "undefined" ? undefined : ResizeObserver),
      ),
    [],
  );
  const root = styles["root"] ?? "pane-root";
  const rule = styles["rule"] ?? "pane-rule";
  const foot = styles["foot"] ?? "pane-foot";
  const zoneCls = styles["zone"] ?? "pane-zone";
  const content = styles["content"] ?? "pane-content";
  return (
    <div ref={pane} className={root}>
      <span className={rule} aria-hidden="true" />
      <div ref={zone} className={zoneCls} data-pane={id}>
        <div className={content}>{children}</div>
      </div>
      <span className={foot} aria-hidden="true" />
    </div>
  );
};
