import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { attachDrag } from "./attachDrag";
import { SNAP_EASE, SNAP_MS, type Stop } from "./drag";

export type SheetRefs = {
  /** Carries --dyn-sheet / --dyn-panel while a drag is live. */
  root: RefObject<HTMLDivElement | null>;
  /** The bottom sheet: its height is the dragged size. */
  sheet: RefObject<HTMLElement | null>;
  /** The dock area (the landscape panel: its width is the dragged size). Holds the grab strips. */
  area: RefObject<HTMLDivElement | null>;
  /** Hidden probes: the cap (block: the half stop) and open panel (inline); the rail (inline). */
  cap: RefObject<HTMLSpanElement | null>;
  /** The header: a full sheet reaches its lower edge. */
  header: RefObject<HTMLElement | null>;
  rail: RefObject<HTMLSpanElement | null>;
};

export type Sheet = {
  stop: Stop;
  /** Every position change goes through here, so the snap spring starts from where it was. */
  go: (next: Stop) => void;
  dragging: boolean;
  /** The size at the drag's start (the JSX value of --dyn-*; live moves write it directly). */
  dyn: number;
  /** The full stop in px: from the header's lower edge to the bottom (--dyn-full). */
  full: number;
};

/** A full sheet runs from the header's lower edge to the bottom of the shell. */
type Boxed = { current: { getBoundingClientRect: () => { bottom: number } } | null };

export const fullOf = (refs: { root: Boxed; header: Boxed }): number => {
  const root = refs.root.current?.getBoundingClientRect();
  const head = refs.header.current?.getBoundingClientRect();
  return root === undefined || head === undefined ? 0 : Math.max(0, root.bottom - head.bottom);
};

const reduced = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Buttons and tabs handle their own taps (a click); a tap anywhere else on a strip toggles. */
export const ownsTap = (el: { closest: (sel: string) => unknown }): boolean =>
  el.closest('button, [role="tab"], a') !== null;

const sizeOf = (refs: SheetRefs, side: boolean): number =>
  (side ? refs.area.current?.offsetWidth : refs.sheet.current?.offsetHeight) ?? 0;

/**
 * V32-BUILD §1L.5: the sheet follows the finger. Pointerdown on a [data-grab] strip (the logo,
 * the dock strip, the panel's bevelled edge) starts tracking; past 6px it is a drag: the edge
 * follows the pointer 1:1 (a third of the travel past closed / full), written straight into a
 * custom property so no render sits between the finger and the edge. Release snaps to the
 * nearest stop or in a flick's direction, with a spring under 250ms (instant under reduced
 * motion). Listeners go on the document (G4: no handlers on plain elements in app/).
 */
export const useSheet = (refs: SheetRefs, side: boolean): Sheet => {
  const [stop, setStop] = useState<Stop>("closed");
  const [dragging, setDragging] = useState(false);
  const [dyn, setDyn] = useState(0);
  const [tick, setTick] = useState(0);
  const [full, setFull] = useState(0);
  const from = useRef<number | null>(null);
  const closed = useRef(0);

  const go = (next: Stop): void => {
    from.current = sizeOf(refs, side);
    setStop(next);
    setTick((t) => t + 1);
  };
  const live = useRef({ stop, side, go });
  live.current = { stop, side, go };

  // After a move commits: note the closed sheet's own height, then spring from the old size.
  useLayoutEffect(() => {
    const el = side ? refs.area.current : refs.sheet.current;
    if (stop === "closed" && !side) closed.current = refs.sheet.current?.offsetHeight ?? 0;
    const start = from.current;
    from.current = null;
    if (start === null || el === null || reduced() || typeof el.animate !== "function") return;
    const key = side ? "inlineSize" : "blockSize";
    const to = side ? el.offsetWidth : el.offsetHeight;
    if (Math.abs(to - start) < 1) return;
    el.animate([{ [key]: `${String(start)}px` }, { [key]: `${String(to)}px` }], {
      duration: SNAP_MS,
      easing: SNAP_EASE,
    });
  }, [tick, stop, side, refs]);

  useEffect(() => {
    const root = refs.root.current;
    if (root === null || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      setFull(fullOf(refs));
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
    };
  }, [refs]);

  useEffect(
    () =>
      attachDrag(document, {
        grab: (target) => {
          const area = refs.area.current;
          if (area === null || !(target instanceof Element) || !area.contains(target)) return null;
          if (target.closest("[data-grab]") === null) return null;
          const { side: horizontal, stop: at } = live.current;
          const size = sizeOf(refs, horizontal);
          if (at === "closed" && !horizontal) closed.current = size;
          const probe = refs.cap.current;
          const cap = (horizontal ? probe?.offsetWidth : probe?.offsetHeight) ?? size;
          return {
            at,
            horizontal,
            size,
            closed: horizontal ? (refs.rail.current?.offsetWidth ?? size) : closed.current,
            cap,
            full: horizontal ? cap : fullOf(refs),
            ownsTap: ownsTap(target),
          };
        },
        begin: (size) => {
          flushSync(() => {
            setDyn(size);
            setDragging(true);
          });
        },
        track: (size, horizontal) => {
          refs.root.current?.style.setProperty(
            horizontal ? "--dyn-panel" : "--dyn-sheet",
            `${String(size)}px`,
          );
        },
        rest: (next, dragged) => {
          live.current.go(next);
          if (dragged) setDragging(false);
        },
      }),
    [refs],
  );

  return { stop, go, dragging, dyn, full };
};
