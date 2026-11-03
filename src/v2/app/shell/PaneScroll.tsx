import type { JSX, ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

import { holdDrag } from "../../design/primitives/Slider/Slider";
import styles from "./PaneScroll.module.css";
import { dragThumb, THUMB_MIN_REM, watchBar } from "./pane-bar";
import {
  COVER,
  coverOf,
  FADE_REM,
  keepFocusClear,
  LIFT_REM,
  realFrames,
  resizeWith,
  ringOf,
  watchCues,
} from "./pane-cues";
import type { Pane } from "./panes";

/** R7: the scroll listener's flags (absent = false). */
export const variants = {
  top: ["true"] as const,
  more: ["true"] as const,
  /** Set by pane-cues while scrolling (touch shows the scrollbar). */
  scrolling: ["true"] as const,
  /** §1MP 10 Short panes: the open header is over a quarter of the area, so it unpins. */
  pin: ["off"] as const,
};

type PaneScrollProps = {
  id: Pane;
  children: ReactNode;
  /** U1: the page-level undo Tile, which can lie over the zone's foot (call4 M1). */
  cover?: RefObject<HTMLElement | null>;
  /** Whether it is shown: on showing, a focused control under it moves clear. */
  covered?: boolean;
};

/**
 * V32-BUILD §1MP items 11–12, every dock pane: the zone under the tab bar is the only thing that
 * scrolls. No edge lines: the content fades out over 1.5rem at the top only while scrolled (from
 * the pinned header's foot down), and at the foot only while more is below. The 2px scrollbar is
 * drawn here, beside the masked zone (B2-r: the native bar is hidden in every engine); aria-hidden,
 * as the zone itself stays scrollable. The zone is never a Tab stop (R6 M2: Firefox makes every
 * scroller one; its ring would sit outside its own mask); a click still focuses it for the keys.
 * On touch the bar shows while scrolling.
 */
export const PaneScroll = ({ id, children, cover, covered }: PaneScrollProps): JSX.Element => {
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
      keepFocusClear(
        zone.current,
        () => FADE_REM * rem(),
        realFrames,
        ringOf,
        () => coverOf(cover?.current ?? null, LIFT_REM * rem()),
      ),
      watchBar<Element>(zone.current, bar.current, min, realFrames, observe),
      dragThumb(thumb.current, zone.current, min, (on) => {
        holdDrag(document.documentElement, on);
      }),
    ];
    return () => {
      for (const stop of stops) stop();
    };
  }, [cover]);
  useEffect(() => {
    const z = zone.current;
    const lift = LIFT_REM * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (z !== null) z.style.setProperty("--dyn-spb", `${coverOf(cover?.current ?? null, lift)}px`);
    const at = document.activeElement;
    if (covered === true && at !== null && zone.current?.contains(at) === true) {
      at.dispatchEvent(new Event(COVER, { bubbles: true }));
    }
  }, [cover, covered]);
  const root = styles["root"] ?? "pane-root";
  const zoneCls = styles["zone"] ?? "pane-zone";
  const content = styles["content"] ?? "pane-content";
  const track = styles["bar"] ?? "pane-bar";
  const grip = styles["thumb"] ?? "pane-thumb";
  return (
    <div className={root}>
      <div
        ref={zone}
        className={zoneCls}
        data-pane={id}
        tabIndex={-1}
        style={{ "--dyn-hh": "0px", "--dyn-spt": "0px", "--dyn-spb": "0px" }}
      >
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
