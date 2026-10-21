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
 * aligns its top.
 */
export const focusShift = (box: Box, clear: Box): number => {
  if (box.top < clear.top || box.bottom - box.top > clear.bottom - clear.top) {
    return box.top - clear.top;
  }
  return box.bottom > clear.bottom ? box.bottom - clear.bottom : 0;
};

type Focused = {
  matches: (sel: string) => boolean;
  closest: (sel: string) => { querySelector: (sel: string) => Focused | null } | null;
  contains: (el: Focused) => boolean;
  getBoundingClientRect: () => Box & { height: number };
};
export type FocusZone = {
  scrollTop: number;
  getBoundingClientRect: () => Box;
  addEventListener: (type: "focusin", fn: (event: { target: unknown }) => void) => void;
  removeEventListener: (type: "focusin", fn: (event: { target: unknown }) => void) => void;
};
export type Frames = { request: (fn: () => void) => number; cancel: (id: number) => void };
const realFrames: Frames = {
  request: (fn) => requestAnimationFrame(fn),
  cancel: (id) => {
    cancelAnimationFrame(id);
  },
};
const isFocused = (t: unknown): t is Focused =>
  typeof t === "object" && t !== null && "matches" in t && "closest" in t;

/**
 * Keyboard focus lands clear of the pinned header and both fades. Chromium reads scroll-padding
 * when it decides whether a focused control needs scrolling, but WebKit doesn't, so the zone
 * corrects after the browser's own focus scroll. The header that can cover a control is its own
 * asset's (sticky only inside that asset), measured live. `fade` is the fade height in px.
 */
export const keepFocusClear = (
  zone: FocusZone | null,
  fade: () => number,
  frames: Frames = realFrames,
): (() => void) => {
  if (zone === null) return () => undefined;
  let frame = 0;
  const onFocus = (event: { target: unknown }): void => {
    const el = event.target;
    if (!isFocused(el) || !el.matches(":focus-visible")) return;
    frames.cancel(frame);
    frame = frames.request(() => {
      const head = el.closest("[data-asset]")?.querySelector(PIN) ?? null;
      if (head?.contains(el) === true) return;
      const z = zone.getBoundingClientRect();
      const f = fade();
      const hh = head?.getBoundingClientRect().height ?? 0;
      const shift = focusShift(el.getBoundingClientRect(), {
        top: z.top + hh + f,
        bottom: z.bottom - f,
      });
      // Whole pixels away from zero: WebKit keeps scrollTop integral, and a truncated 0.9px
      // would leave the control's foot in the fade.
      if (shift !== 0) zone.scrollTop += shift > 0 ? Math.ceil(shift) : Math.floor(shift);
    });
  };
  zone.addEventListener("focusin", onFocus);
  return () => {
    frames.cancel(frame);
    zone.removeEventListener("focusin", onFocus);
  };
};
