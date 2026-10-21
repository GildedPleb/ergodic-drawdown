import type { JSX, ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";

import styles from "./PaneScroll.module.css";
import { resizeWith, watchCues } from "./pane-cues";
import type { Pane } from "./panes";

/** R7: the scroll listener's flags (absent = false). */
export const variants = {
  top: ["true"] as const,
  more: ["true"] as const,
  /** Set by pane-cues while scrolling (touch shows the scrollbar). */
  scrolling: ["true"] as const,
};

type PaneScrollProps = { id: Pane; children: ReactNode };

/**
 * V32-BUILD §1MP items 11–12, every dock pane: the zone under the tab bar is the only thing that
 * scrolls. No edge lines: the content fades out over 1.5rem at the top only while scrolled (from
 * the pinned header's foot down), and at the foot only while more is below. A thin 2px scrollbar
 * with its space always reserved; on touch it shows while scrolling.
 */
export const PaneScroll = ({ id, children }: PaneScrollProps): JSX.Element => {
  const zone = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () =>
      watchCues<Element>(
        zone.current,
        resizeWith<Element>(typeof ResizeObserver === "undefined" ? undefined : ResizeObserver),
      ),
    [],
  );
  const root = styles["root"] ?? "pane-root";
  const zoneCls = styles["zone"] ?? "pane-zone";
  const content = styles["content"] ?? "pane-content";
  return (
    <div className={root}>
      <div ref={zone} className={zoneCls} data-pane={id} style={{ "--dyn-hh": "0px" }}>
        <div className={content}>{children}</div>
      </div>
    </div>
  );
};
