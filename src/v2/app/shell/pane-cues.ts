import { REVEAL } from "../../design/primitives/Select/logic";

/**
 * V32-BUILD §1MP items 10–12: a dock pane's scroll cues, written straight onto the zone (no
 * re-render): data-top while scrolled away from the top, data-more while more is below,
 * --dyn-hh the height of a pinned header over the zone's top (the top fade starts at its foot),
 * and data-scrolling while scrolling (touch shows the scrollbar), cleared ~1s after it stops.
 */
export type Cues = { top: boolean; more: boolean; hh: number };

type Box = { top: number; bottom: number };
type Pin = { getBoundingClientRect: () => Box };
export type Zone<E> = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  firstElementChild: E | null;
  dataset: Record<string, string | undefined>;
  style: { setProperty: (name: string, value: string) => void };
  getBoundingClientRect: () => Box;
  querySelectorAll: (sel: string) => Iterable<Pin>;
  addEventListener: (type: "scroll", fn: () => void, opts: { passive: true }) => void;
  removeEventListener: (type: "scroll", fn: () => void) => void;
};
export type Observe<E> = (els: E[], fn: () => void) => () => void;

/** A sub-pixel remainder at the foot is not "more below". */
const SLACK = 1;
/** Touch: the scrollbar hides this long after the last scroll. */
export const SCROLL_IDLE_MS = 1000;
/** An open asset's header (AssetRow marks it). */
export const PIN = "[data-pin]";

export const cuesOf = <E>(zone: Zone<E>): Cues => {
  const top = zone.scrollTop > 0;
  const z = zone.getBoundingClientRect().top;
  let hh = 0;
  if (top) {
    for (const pin of zone.querySelectorAll(PIN)) {
      const r = pin.getBoundingClientRect();
      if (r.top <= z + 0.5 && r.bottom > z) hh = Math.max(hh, r.bottom - z);
    }
  }
  return {
    top,
    more: zone.scrollHeight - zone.clientHeight - zone.scrollTop > SLACK,
    hh,
  };
};

export const paintCues = <E>(zone: Zone<E>): Cues => {
  const c = cuesOf(zone);
  zone.dataset["top"] = String(c.top);
  zone.dataset["more"] = String(c.more);
  zone.style.setProperty("--dyn-hh", `${c.hh.toFixed(2)}px`);
  return c;
};

type Timers = {
  set: (fn: () => void, ms: number) => unknown;
  clear: (id: unknown) => void;
};
const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => {
    if (typeof id === "number") clearTimeout(id);
  },
};

/** Paints now, on every scroll, and whenever the zone or its content resizes. Returns the detach. */
export const watchCues = <E>(
  zone: (Zone<E> & E) | null,
  observe?: Observe<E>,
  timers: Timers = realTimers,
): (() => void) => {
  if (zone === null) return () => undefined;
  let idle: unknown;
  const paint = (): void => {
    paintCues(zone);
  };
  const onScroll = (): void => {
    paint();
    zone.dataset["scrolling"] = "true";
    timers.clear(idle);
    idle = timers.set(() => {
      delete zone.dataset["scrolling"];
    }, SCROLL_IDLE_MS);
  };
  paint();
  zone.addEventListener("scroll", onScroll, { passive: true });
  const els: E[] = [zone];
  if (zone.firstElementChild !== null) els.push(zone.firstElementChild);
  const unobserve = observe?.(els, paint);
  return () => {
    zone.removeEventListener("scroll", onScroll);
    timers.clear(idle);
    unobserve?.();
  };
};

type RO<E> = new (fn: () => void) => { observe: (el: E) => void; disconnect: () => void };

export const resizeWith = <E>(Ctor: RO<E> | undefined): Observe<E> | undefined =>
  Ctor === undefined
    ? undefined
    : (els, fn) => {
        const observer = new Ctor(fn);
        for (const el of els) observer.observe(el);
        return () => {
          observer.disconnect();
        };
      };

/** §1MP 12: each fade is 1.5rem (`--s-6`), measured against the root font size. */
export const FADE_REM = 1.5;

/**
 * §1MP 10, Probe M1: how far to scroll the zone so a focused box sits in the clear band (below the
 * pinned header and the top fade, above the bottom fade). 0 leaves it. A box taller than the band
 * aligns its top. Form 9a: `ring` (the focus outline's reach past the box) counts as part of it.
 */
export const focusShift = (b: Box, clear: Box, ring = 0): number => {
  const box = { top: b.top - ring, bottom: b.bottom + ring };
  // Whole pixels (WebKit keeps scrollTop integral), rounded so the aligned edge lands inside the
  // band: down to align a top, up to align a foot. A truncated 0.9px left a foot in the fade.
  if (box.top < clear.top || box.bottom - box.top > clear.bottom - clear.top) {
    return Math.floor(box.top - clear.top);
  }
  return box.bottom > clear.bottom ? Math.ceil(box.bottom - clear.bottom) : 0;
};

/** How far a focused element's outline reaches past its box (outline-width + outline-offset). */
export const ringOf = (el: unknown): number => {
  if (typeof Element === "undefined" || !(el instanceof Element)) return 0;
  const cs = getComputedStyle(el);
  if (cs.outlineStyle === "none") return 0;
  return Math.max(0, Number.parseFloat(cs.outlineWidth) + Number.parseFloat(cs.outlineOffset)) || 0;
};
type Focused = {
  matches: (sel: string) => boolean;
  closest: (
    sel: string,
  ) => { querySelector: (sel: string) => Focused | null; getBoundingClientRect: () => Box } | null;
  contains: (el: Focused) => boolean;
  getBoundingClientRect: () => Box & { height: number };
  querySelector?: (sel: string) => Focused | null;
};
type Listen = "focusin" | "scroll" | typeof REVEAL;
export type FocusZone = {
  scrollTop: number;
  getBoundingClientRect: () => Box;
  addEventListener: (type: Listen, fn: (event: { target: unknown }) => void) => void;
  removeEventListener: (type: Listen, fn: (event: { target: unknown }) => void) => void;
};
export type Frames = { request: (fn: () => void) => number; cancel: (id: number) => void };
export const realFrames: Frames = {
  request: (fn) => requestAnimationFrame(fn),
  cancel: (id) => {
    cancelAnimationFrame(id);
  },
};
const isFocused = (t: unknown): t is Focused =>
  typeof t === "object" && t !== null && "matches" in t && "closest" in t;

/**
 * Form §1MP ruling 5: an opened list scrolls the pane just enough to show all of it in the clear
 * band. A list taller than the band shows its top, unless that would hide its focused option; then
 * as much of the pick as fits, its top first.
 */
export const revealShift = (list: Box, focused: Box | null, clear: Box): number => {
  const s = focusShift(list, clear);
  if (focused === null || focused.bottom - s <= clear.bottom) return s;
  // Up to show the pick's foot, but never past its own top (Probe N2: at 320 the band is 77px and
  // every row 80–124px, so uncapped this ran the list top under the pinned header).
  return Math.min(Math.ceil(focused.bottom - clear.bottom), Math.floor(focused.top - clear.top));
};

/**
 * Keyboard focus lands clear of the pinned header and both fades. The header that can cover a
 * control is its own asset's (sticky only inside that asset), measured live. The header itself is
 * measured at its own place in the asset (pinned, no shift moves it, and its ring's foot reaches
 * into the top fade that starts at its foot: R6 F1b), against the band below the top fade. `fade`
 * is the fade height in px. An
 * opened list (REVEAL) is shown whole the same way; it supersedes its option's focus correction.
 * Form 9c: the browser centres a focused control ("if needed"), before focusin (Chromium, Firefox)
 * or just after (WebKit), so the correction starts from the zone's resting scrollTop (its last
 * scroll event, which comes after the focus scroll, or its own write) and moves the minimum.
 */
export const keepFocusClear = (
  zone: FocusZone | null,
  fade: () => number,
  frames: Frames = realFrames,
  ring: (el: unknown) => number = ringOf,
): (() => void) => {
  if (zone === null) return () => undefined;
  let frame = 0;
  let rest = zone.scrollTop;
  const onScroll = (): void => {
    rest = zone.scrollTop;
  };
  const correct = (el: Focused, shiftOf: (box: Box, clear: Box) => number, from?: number): void => {
    frames.cancel(frame);
    frame = frames.request(() => {
      if (from !== undefined && zone.scrollTop !== from) zone.scrollTop = from;
      const asset = el.closest("[data-asset]");
      const head = asset?.querySelector(PIN) ?? null;
      const own = head?.contains(el) === true;
      const z = zone.getBoundingClientRect();
      const f = fade();
      const pin = head?.getBoundingClientRect();
      const hh = own ? 0 : (pin?.height ?? 0);
      const stuck =
        own && pin && asset ? Math.max(0, pin.top - asset.getBoundingClientRect().top) : 0;
      const b = el.getBoundingClientRect();
      const shift = shiftOf(
        { top: b.top - stuck, bottom: b.bottom - stuck },
        { top: z.top + hh + f, bottom: z.bottom - f },
      );
      if (shift !== 0) zone.scrollTop += shift;
      rest = zone.scrollTop;
    });
  };
  const onFocus = (event: { target: unknown }): void => {
    const el = event.target;
    if (isFocused(el) && el.matches(":focus-visible")) {
      correct(el, (box, clear) => focusShift(box, clear, ring(el)), rest);
    }
  };
  const onReveal = (event: { target: unknown }): void => {
    const el = event.target;
    if (!isFocused(el)) return;
    correct(el, (box, clear) => {
      const inner = el.querySelector?.(":focus")?.getBoundingClientRect() ?? null;
      return revealShift(box, inner, clear);
    });
  };
  zone.addEventListener("scroll", onScroll);
  zone.addEventListener("focusin", onFocus);
  zone.addEventListener(REVEAL, onReveal);
  return () => {
    frames.cancel(frame);
    zone.removeEventListener("scroll", onScroll);
    zone.removeEventListener("focusin", onFocus);
    zone.removeEventListener(REVEAL, onReveal);
  };
};
