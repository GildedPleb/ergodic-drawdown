import type { JSX, ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";

import { holdDrag } from "../../design/primitives/Slider/Slider";
import styles from "./PaneScroll.module.css";
import { dragThumb, THUMB_MIN_REM, watchBar } from "./pane-bar";
import { FADE_REM, keepFocusClear, realFrames, resizeWith, watchCues } from "./pane-cues";
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
 * the pinned header's foot down), and at the foot only while more is below. The 2px scrollbar is
 * drawn here, beside the masked zone (B2-r: the native bar is hidden in every engine); aria-hidden,
 * as the zone itself stays focusable and scrollable. On touch it shows while scrolling.
 */
export const PaneScroll = ({ id, children }: PaneScrollProps): JSX.Element => {
  const zone = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const observe = resizeWith<Element>(
      typeof ResizeObserver === "undefined" ? undefined : ResizeObserver,
    );
    const rem = (): number =>
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const min = (): number => THUMB_MIN_REM * rem();
    const stops = [
      watchCues<Element>(zone.current, observe),
      keepFocusClear(zone.current, () => FADE_REM * rem()),
      watchBar<Element>(zone.current, bar.current, min, realFrames, observe),
      dragThumb(thumb.current, zone.current, min, (on) => {
        holdDrag(document.documentElement, on);
      }),
    ];
    return () => {
      for (const stop of stops) stop();
    };
  }, []);
  const root = styles["root"] ?? "pane-root";
  const zoneCls = styles["zone"] ?? "pane-zone";
  const content = styles["content"] ?? "pane-content";
  const track = styles["bar"] ?? "pane-bar";
  const grip = styles["thumb"] ?? "pane-thumb";
  return (
    <div className={root}>
      <div ref={zone} className={zoneCls} data-pane={id} style={{ "--dyn-hh": "0px" }}>
        <div className={content}>{children}</div>
      </div>
      <div
        ref={bar}
        className={track}
        aria-hidden="true"
        hidden
        style={{ "--dyn-th": "0px", "--dyn-ty": "0px" }}
      >
        <div ref={thumb} className={grip} />
      </div>
    </div>
  );
};
