import type { JSX, ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

import { holdDrag } from "../../design/primitives/Slider/Slider";
import styles from "./PaneScroll.module.css";
import { dragThumb, THUMB_MIN_REM, watchBar } from "./pane-bar";
import {
  COVER,
  FADE_REM,
  HIT_REM,
  keepFocusClear,
  paintCues,
  reachOf,
  realFrames,
  resizeWith,
  ringOf,
  watchCues,
} from "./pane-cues";
import type { Edge } from "./pane-cues";
import type { Pane } from "./panes";

/** R7: the scroll listener's flags (absent = false). */
export const variants = {
  top: ["true"] as const,
  more: ["true"] as const,
  /** Set by pane-cues while scrolling (touch shows the scrollbar). */
  scrolling: ["true"] as const,
  /** §1MP 10 Short panes (r53): pinned, the header would leave under one row clear, so it unpins. */
  pin: ["off"] as const,
};

type PaneScrollProps = {
  id: Pane;
  children: ReactNode;
  /** U1: the page-level undo Tile, which can lie over the zone's foot (r53 clear area). */
  cover?: RefObject<HTMLElement | null>;
  /** Whether it is shown: on showing, a focused control under it moves clear. */
  covered?: boolean;
};

const rem = (): number =>
  Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/**
 * V32 r53 clear area: the fade, one row and Undo's reach, measured now. The Tile is read at each
 * call: it can remount, and a detached one (under its old inert wrapper) reads as hidden.
 */
const edgeOf =
  (zone: HTMLElement | null, tile: RefObject<HTMLElement | null> | undefined): (() => Edge) =>
  () => ({ fade: FADE_REM * rem(), hit: HIT_REM * rem(), ...reachOf(tile?.current ?? null, zone) });

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
    const min = (): number => THUMB_MIN_REM * rem();
    const tile = cover?.current ?? null;
    const edge = edgeOf(zone.current, cover);
    const stops = [
      watchCues<Element>(zone.current, observe, undefined, edge, tile ? [tile] : []),
      keepFocusClear(
        zone.current,
        () => FADE_REM * rem(),
        realFrames,
        ringOf,
        () => {
          const e = edge();
          return e.shown ? e.reach : 0;
        },
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
    // r53: Undo showing or hiding moves the bottom inset (and so scroll-padding-block-end).
    if (z !== null) paintCues(z, edgeOf(z, cover)());
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
