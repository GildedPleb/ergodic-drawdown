import { gesture, type Stop, stopsFor, toggleStop } from "./drag";

/** What a pointerdown on a grab strip knows: nothing about the DOM beyond these numbers. */
type Grab = {
  at: Stop;
  horizontal: boolean;
  /** The sheet's height (or the panel's width) now; closed, the cap (half / open panel), full. */
  size: number;
  closed: number;
  cap: number;
  full: number;
  /** A button or tab under the pointer handles its own tap (its click). */
  ownsTap: boolean;
};

export type DragHooks = {
  /** The grab under a pointerdown, or null when it is not on a grab strip. */
  grab: (target: EventTarget | null) => Grab | null;
  /** The gesture became a drag: render the dragging state at the start size. */
  begin: (size: number, horizontal: boolean) => void;
  /** Live size, every move (straight into the custom property: no render between). */
  track: (size: number, horizontal: boolean) => void;
  /** Rest at this stop (a snap, a cancel or a tap's toggle). */
  rest: (next: Stop, dragged: boolean) => void;
};

type PointerLike = Event & {
  pointerId: number;
  clientX: number;
  clientY: number;
  button: number;
};

const isPointer = (e: Event): e is PointerLike =>
  "pointerId" in e &&
  typeof e.pointerId === "number" &&
  "clientX" in e &&
  typeof e.clientX === "number" &&
  "clientY" in e &&
  typeof e.clientY === "number";

/**
 * V32-BUILD §1L.5 wiring: document listeners (G4: none on plain elements in app/) driving one
 * gesture per pointerdown on a grab strip. After a drag, the click it ends with is swallowed.
 * Returns the detach function.
 */
export const attachDrag = (doc: EventTarget, hooks: DragHooks): (() => void) => {
  let suppress = false;
  const onDown = (down: Event): void => {
    if (!isPointer(down) || down.button !== 0) return;
    const grab = hooks.grab(down.target);
    if (grab === null) return;
    const { horizontal, at } = grab;
    const g = gesture(
      { x: down.clientX, y: down.clientY, t: down.timeStamp, size: grab.size, at },
      horizontal,
      stopsFor(horizontal, grab.closed, grab.cap, grab.full),
    );
    const onMove = (move: Event): void => {
      if (!isPointer(move) || move.pointerId !== down.pointerId) return;
      const was = g.dragging();
      const size = g.move(move.clientX, move.clientY, move.timeStamp);
      if (size === null) return;
      if (!was) hooks.begin(grab.size, horizontal);
      hooks.track(size, horizontal);
    };
    const finish = (up: Event): void => {
      if (!isPointer(up) || up.pointerId !== down.pointerId) return;
      doc.removeEventListener("pointermove", onMove);
      doc.removeEventListener("pointerup", finish);
      doc.removeEventListener("pointercancel", finish);
      const next = g.release(up.timeStamp, up.type !== "pointerup");
      if (next === null) {
        if (up.type === "pointerup" && !grab.ownsTap) hooks.rest(toggleStop(at), false);
        return;
      }
      suppress = true;
      setTimeout(() => {
        suppress = false;
      }, 0);
      hooks.rest(next, true);
    };
    doc.addEventListener("pointermove", onMove);
    doc.addEventListener("pointerup", finish);
    doc.addEventListener("pointercancel", finish);
  };
  const onClick = (event: Event): void => {
    if (!suppress) return;
    event.stopPropagation();
    event.preventDefault();
    suppress = false;
  };
  doc.addEventListener("pointerdown", onDown);
  doc.addEventListener("click", onClick, true);
  return () => {
    doc.removeEventListener("pointerdown", onDown);
    doc.removeEventListener("click", onClick, true);
  };
};
