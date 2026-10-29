import { file } from "bun";
import { expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PaneScroll } from "../../src/v2/app/shell/PaneScroll";
import { dragScroll, dragThumb, thumbOf, watchBar } from "../../src/v2/app/shell/pane-bar";
import { REVEAL } from "../../src/v2/design/primitives/Select/logic";
import {
  cuesOf,
  focusShift,
  ringOf,
  keepFocusClear,
  revealShift,
  paintCues,
  PIN,
  resizeWith,
  SCROLL_IDLE_MS,
  watchCues,
  type Zone,
} from "../../src/v2/app/shell/pane-cues";

// V32-BUILD §1MP items 10–12 (supersede §1Y): a dock pane's scroll zone, fades, no edge lines.
const v2 = `${import.meta.dir}/../../src/v2`;

type Box = { top: number; bottom: number };
type FakeZone = Zone<unknown> & {
  fire: () => void;
  listening: () => boolean;
  props: Map<string, string>;
};

const fakeZone = (
  over: Partial<{ scrollTop: number; scrollHeight: number; clientHeight: number }> = {},
  pins: Box[] = [],
): FakeZone => {
  let fn: (() => void) | null = null;
  const props = new Map<string, string>();
  return {
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 400,
    ...over,
    firstElementChild: "content",
    dataset: {},
    style: {
      setProperty: (k, v) => {
        props.set(k, v);
      },
    },
    props,
    getBoundingClientRect: () => ({ top: 100, bottom: 500 }),
    querySelectorAll: (sel) =>
      sel === PIN ? pins.map((b) => ({ getBoundingClientRect: () => b })) : [],
    addEventListener: (_type, f) => {
      fn = f;
    },
    removeEventListener: () => {
      fn = null;
    },
    fire: () => {
      fn?.();
    },
    listening: () => fn !== null,
  };
};

test("1MP 11: top fade only once scrolled, foot fade only while more is below (sub-pixel is not more)", () => {
  expect(cuesOf(fakeZone())).toEqual({ top: false, more: true, hh: 0 });
  expect(cuesOf(fakeZone({ scrollTop: 300 }))).toEqual({ top: true, more: true, hh: 0 });
  expect(cuesOf(fakeZone({ scrollTop: 600 }))).toEqual({ top: true, more: false, hh: 0 });
  expect(cuesOf(fakeZone({ scrollTop: 599.5 })).more).toBe(false);
  expect(cuesOf(fakeZone({ scrollTop: 598 })).more).toBe(true);
  // Content that fits: no fades.
  expect(cuesOf(fakeZone({ scrollHeight: 400 }))).toEqual({ top: false, more: false, hh: 0 });
});

test("1MP 10–11: the top fade starts at the foot of a header pinned over the zone's top", () => {
  // Pinned (its top at the zone's top): the fade starts 52px down.
  expect(cuesOf(fakeZone({ scrollTop: 50 }, [{ top: 100, bottom: 152 }])).hh).toBe(52);
  // A header still in the flow below the top, or one that has scrolled off: no offset.
  expect(cuesOf(fakeZone({ scrollTop: 50 }, [{ top: 180, bottom: 232 }])).hh).toBe(0);
  expect(cuesOf(fakeZone({ scrollTop: 50 }, [{ top: 20, bottom: 90 }])).hh).toBe(0);
  // Form "Fade at a pinned header's exit": once its asset's foot pushes it out (top above the
  // zone's, foot still inside), it is no longer pinned and takes the standard top fade.
  expect(cuesOf(fakeZone({ scrollTop: 50 }, [{ top: 80, bottom: 130 }])).hh).toBe(0);
  expect(cuesOf(fakeZone({ scrollTop: 50 }, [{ top: 99.5, bottom: 151.5 }])).hh).toBe(51.5);
  // Not scrolled: nothing is pinned yet.
  expect(cuesOf(fakeZone({}, [{ top: 100, bottom: 152 }])).hh).toBe(0);
});

test("1MP 11: paint writes the zone's flags and --dyn-hh", () => {
  const zone = fakeZone({ scrollTop: 200 }, [{ top: 100, bottom: 140 }]);
  expect(paintCues(zone)).toEqual({ top: true, more: true, hh: 40 });
  expect(zone.dataset).toEqual({ top: "true", more: "true" });
  expect(zone.props.get("--dyn-hh")).toBe("40.00px");
  const top = fakeZone();
  paintCues(top);
  expect(top.dataset).toEqual({ top: "false", more: "true" });
  expect(top.props.get("--dyn-hh")).toBe("0.00px");
});

test("1MP 11–12: watch paints now, on scroll and on resize; scrolling flags ~1s; detach stops all", () => {
  const zone = fakeZone();
  let watched: unknown[] = [];
  let resize: (() => void) | null = null;
  let disconnected = false;
  const pending: { fn: () => void; ms: number; id: number }[] = [];
  let ids = 0;
  const timers = {
    set: (fn: () => void, ms: number) => {
      ids += 1;
      pending.push({ fn, ms, id: ids });
      return ids;
    },
    clear: (id: unknown) => {
      const at = pending.findIndex((t) => t.id === id);
      if (at >= 0) pending.splice(at, 1);
    },
  };
  const stop = watchCues(
    zone,
    (els, fn) => {
      watched = els;
      resize = fn;
      return () => {
        disconnected = true;
      };
    },
    timers,
  );
  expect(zone.dataset["top"]).toBe("false");
  expect(watched.length).toBe(2);
  zone.scrollTop = 600;
  zone.fire();
  expect(zone.dataset).toEqual({ top: "true", more: "false", scrolling: "true" });
  zone.fire(); // a second scroll restarts the one idle timer
  expect(pending.map((t) => t.ms)).toEqual([SCROLL_IDLE_MS]);
  pending[0]?.fn();
  expect(zone.dataset["scrolling"]).toBe(undefined);
  zone.scrollHeight = 2000;
  (resize as (() => void) | null)?.();
  expect(zone.dataset["more"]).toBe("true");
  stop();
  expect(zone.listening()).toBe(false);
  expect(disconnected).toBe(true);
  // No zone (not mounted) or no ResizeObserver: no-ops.
  watchCues(null)();
  const bare = fakeZone();
  watchCues(bare)();
  expect(bare.listening()).toBe(false);
});

test("1MP: resizeWith wraps a ResizeObserver over every element; none without one", () => {
  expect(resizeWith(undefined)).toBe(undefined);
  const seen: string[] = [];
  let off = false;
  class RO {
    constructor(readonly fn: () => void) {}
    observe(el: string): void {
      seen.push(el);
    }
    disconnect(): void {
      off = true;
    }
  }
  const stop = resizeWith<string>(RO)?.(["a", "b"], () => undefined);
  expect(seen).toEqual(["a", "b"]);
  stop?.();
  expect(off).toBe(true);
});

test("1MP 11 / B2-r: the zone, then its drawn bar (aria-hidden, hidden until it scrolls); no edge lines", () => {
  const html = renderToStaticMarkup(createElement(PaneScroll, { id: "models", children: "x" }));
  expect(/data-pane="models"[^>]*style="--dyn-hh:0px"/.test(html)).toBe(true);
  expect(
    /<\/div><\/div><div[^>]*aria-hidden="true" hidden=""[^>]*--dyn-th:0px;--dyn-ty:0px/.test(html),
  ).toBe(true);
  expect((html.match(/<div/g) ?? []).length).toBe(5); // root, zone, content, bar, thumb
});

test("R6 M2: the zone is never a Tab stop (Firefox makes every scroller one), still click-focusable", () => {
  const html = renderToStaticMarkup(createElement(PaneScroll, { id: "models", children: "x" }));
  expect(/<div[^>]*data-pane="models"[^>]*tabindex="-1"/.test(html)).toBe(true);
});

test("1MP 11–12 / B2-r: one linear mask layer over the full width (no bar column), no edge lines", async () => {
  const pane = await file(`${v2}/app/shell/PaneScroll.module.css`).text();
  expect(/\.rule|\.foot|border/.test(pane)).toBe(false);
  expect(pane.includes("mask:")).toBe(true);
  expect(/\[data-top="true"\] \{\s*--_ft: var\(--s-6\);/.test(pane)).toBe(true);
  expect(/\[data-more="true"\] \{\s*--_fb: var\(--s-6\);/.test(pane)).toBe(true);
  const mask = /mask:([^;]*);/.exec(pane)?.[1] ?? "";
  expect((mask.match(/linear-gradient/g) ?? []).length).toBe(1);
  expect(/no-repeat|--_sb|scrollbar-gutter|-webkit-scrollbar-(track|thumb)/.test(pane)).toBe(false);
  expect(pane.includes("scrollbar-width: none;")).toBe(true); // every engine's native bar hidden
  expect(/::-webkit-scrollbar \{\s*display: none;/.test(pane)).toBe(true);
  expect(/\.bar \{[^}]*inline-size: var\(--s-0\);[^}]*background: var\(--rule\);/.test(pane)).toBe(
    true,
  );
  expect(
    /\.thumb \{[^}]*block-size: var\(--dyn-th\);[^}]*background: var\(--accent\);/.test(pane),
  ).toBe(true);
  expect(/:hover/.test(pane)).toBe(false); // no hover change
  expect(pane.includes("overflow-y: auto;")).toBe(true);
  expect(pane.includes("overscroll-behavior: contain;")).toBe(true);
  expect(pane.includes("scroll-padding-block-start: var(--hit);")).toBe(true);
  expect(/transition|animation/.test(pane)).toBe(false);
  const row = await file(`${v2}/design/primitives/AssetRow/AssetRow.module.css`).text();
  expect(row.includes("position: sticky;")).toBe(true);
});

test("Probe 1MP M1: focus lands below the pinned header and its fade, above the bottom fade", () => {
  // WebKit 390: zone 115.5–832, header 48.2 tall, fades 24 → clear band 187.7–808.
  const clear = { top: 115.5 + 48.2 + 24, bottom: 832 - 24 };
  expect(focusShift({ top: 131, bottom: 151 }, clear)).toBe(Math.floor(131 - 187.7)); // under the header
  expect(focusShift({ top: 184.6, bottom: 202.6 }, clear)).toBe(-4); // -3.1, down: top lands inside // in the top fade
  expect(focusShift({ top: 799.5, bottom: 817.5 }, clear)).toBe(10); // 9.5, up: foot lands inside // in the bottom fade
  expect(focusShift({ top: 400, bottom: 444 }, clear)).toBe(0); // clear: leave it
  expect(focusShift({ top: 100, bottom: 900 }, clear)).toBe(Math.floor(100 - 187.7)); // taller: top
});

test("Probe 1MP M1: keyboard focus under the asset's pinned header scrolls up clear of it; mouse focus and the header itself don't", () => {
  let listener: ((e: { target: unknown }) => void) | undefined;
  const zone = {
    scrollTop: 500,
    getBoundingClientRect: () => ({ top: 115.5, bottom: 832 }),
    addEventListener: (type: string, fn: (e: { target: unknown }) => void) => {
      if (type === "focusin") listener = fn;
    },
    removeEventListener: () => {
      listener = undefined;
    },
  };
  const queued: (() => void)[] = [];
  const frames = {
    request: (fn: () => void) => queued.push(fn),
    cancel: () => undefined,
  };
  const header = {
    matches: () => false,
    closest: () => null,
    contains: (el: unknown) => el === header,
    getBoundingClientRect: () => ({ top: 115.5, bottom: 163.7, height: 48.2 }),
  };
  const control = (top: number, visible = true) => ({
    matches: () => visible,
    closest: () => ({
      querySelector: () => header,
      getBoundingClientRect: () => header.getBoundingClientRect(),
    }),
    contains: () => false,
    getBoundingClientRect: () => ({ top, bottom: top + 20, height: 20 }),
  });
  const stop = keepFocusClear(zone, () => 24, frames);
  listener?.({ target: control(131) });
  listener?.({ target: control(131, false) }); // a click: the browser's own scroll stands
  listener?.({ target: header }); // the header holds focus itself: nothing to clear
  listener?.({ target: "text" });
  for (const run of queued.splice(0)) run();
  expect(zone.scrollTop).toBe(500 + Math.floor(131 - (115.5 + 48.2 + 24))); // whole px, up
  stop();
  expect(listener).toBeUndefined();
});

test("Form ruling 5: an opened list scrolls the pane just enough to show all of it", () => {
  // 1440: zone 598–878, header 50.44, fades 24 → clear band 672.44–854. The walk list 796–917.
  const clear = { top: 598 + 50.44 + 24, bottom: 878 - 24 };
  expect(revealShift({ top: 796, bottom: 917 }, null, clear)).toBe(917 - 854); // up by its overhang
  expect(revealShift({ top: 700, bottom: 800 }, null, clear)).toBe(0); // shown already: stays
  // Taller than the band: its top, unless the focused option would then sit in the bottom fade.
  expect(revealShift({ top: 700, bottom: 1100 }, null, clear)).toBe(27); // 27.56 down: top inside
  const focused = { top: 1040, bottom: 1084 };
  expect(revealShift({ top: 700, bottom: 1100 }, focused, clear)).toBe(1084 - 854);
});

test("Form ruling 5: the reveal is heard on the zone, supersedes the option's focus correction, and detaches", () => {
  const heard = new Map<string, (e: { target: unknown }) => void>();
  const zone = {
    scrollTop: 100,
    getBoundingClientRect: () => ({ top: 598, bottom: 878 }),
    addEventListener: (type: string, fn: (e: { target: unknown }) => void) => heard.set(type, fn),
    removeEventListener: (type: string) => heard.delete(type),
  };
  const queued = new Map<number, () => void>();
  let id = 0;
  const frames = {
    request: (fn: () => void) => {
      queued.set(++id, fn);
      return id;
    },
    cancel: (n: number) => queued.delete(n),
  };
  const option = {
    matches: () => true,
    closest: () => null,
    contains: () => false,
    getBoundingClientRect: () => ({ top: 820, bottom: 864, height: 44 }),
  };
  const list = {
    ...option,
    getBoundingClientRect: () => ({ top: 796, bottom: 917, height: 121 }),
    querySelector: () => option,
  };
  const stop = keepFocusClear(zone, () => 24, frames);
  heard.get("focusin")?.({ target: option });
  heard.get(REVEAL)?.({ target: list });
  expect(queued.size).toBe(1); // the option's correction was cancelled
  for (const run of queued.values()) run();
  expect(zone.scrollTop).toBe(100 + Math.ceil(917 - 854));
  stop();
  expect(heard.size).toBe(0);
});

test("ruling: the pane scroller never scrolls sideways (overflow-x: clip)", async () => {
  const css = await file(`${v2}/app/shell/PaneScroll.module.css`).text();
  const zone = /\.zone \{([^}]*)\}/.exec(css)?.[1] ?? "";
  expect(zone.includes("overflow-x: clip;") && zone.includes("overflow-y: auto;")).toBe(true);
});

test("Probe N2: a pick taller than the band shows its top; the list never starts under the header", () => {
  // 320×568: zone 382.7–556, header 48.2, fades 24 → band 454.9–532 (77px); rows are 80–124px.
  const clear = { top: 382.7 + 48.2 + 24, bottom: 556 - 24 };
  const list = { top: 480, bottom: 1230 };
  const pick0 = { top: 480, bottom: 604 }; // the pick is row 0, 124px
  expect(revealShift(list, pick0, clear)).toBe(Math.floor(480 - clear.top)); // list top = band top
  const pick3 = { top: 860, bottom: 940 }; // a later pick, 80px: its top at the band top
  expect(revealShift(list, pick3, clear)).toBe(Math.floor(860 - clear.top));
  const small = { top: 860, bottom: 904 }; // a 44px pick fits: its foot at the band foot
  expect(revealShift(list, small, clear)).toBe(Math.ceil(904 - clear.bottom));
});

test("Form 9a: on Tab the control and its whole focus ring land in the clear band (320×568)", () => {
  // Chromium 320: band 454.9–532; the ring is --focus-w 2 + --focus-offset 2 = 4px.
  const clear = { top: 454.9, bottom: 532 };
  const vol = { top: 513.8, bottom: 531.8 }; // the Volatility field, foot at the band foot
  expect(focusShift(vol, clear)).toBe(0); // before: its ring's foot sat 3.8px in the fade
  expect(focusShift(vol, clear, 4)).toBe(Math.ceil(531.8 + 4 - 532)); // the minimum: ring foot in
  const high = { top: 456, bottom: 476 };
  expect(focusShift(high, clear, 4)).toBe(Math.floor(456 - 4 - 454.9)); // ring top to band top
  const tall = { top: 455.4, bottom: 579.2 }; // a 124px option: still its top first (ruling 9)
  expect(focusShift(tall, clear, 4)).toBe(Math.floor(455.4 - 4 - 454.9));
  expect(ringOf({})).toBe(0); // not an element: no ring
  let listener: ((e: { target: unknown }) => void) | undefined;
  const zone = {
    scrollTop: 0,
    getBoundingClientRect: () => ({ top: 382.7, bottom: 556 }),
    addEventListener: (type: string, fn: (e: { target: unknown }) => void) => {
      if (type === "focusin") listener = fn;
    },
    removeEventListener: () => undefined,
  };
  const queued: (() => void)[] = [];
  const control = {
    matches: () => true,
    closest: () => null,
    contains: () => false,
    getBoundingClientRect: () => ({ ...vol, height: 18 }),
  };
  keepFocusClear(
    zone,
    () => 24,
    { request: (fn) => queued.push(fn), cancel: () => undefined },
    (el) => (el === control ? 4 : 0),
  );
  listener?.({ target: control });
  for (const run of queued.splice(0)) run();
  expect(zone.scrollTop).toBe(4); // band foot 532 = 556 − 24; ring foot 535.8 → up 4
});

test("B2-r: the drawn thumb's length and offset follow the native proportional rule; off when nothing scrolls", () => {
  // 1440: zone 280 tall, content 1176: length round(280² / 1176), offset (280 − 67) × 50 / 896.
  expect(thumbOf({ clientHeight: 280, scrollHeight: 1176, scrollTop: 50 }, 24)).toEqual({
    on: true,
    size: 67,
    offset: 12,
  });
  expect(thumbOf({ clientHeight: 280, scrollHeight: 1176, scrollTop: 896 }, 24).offset).toBe(213); // at the end
  expect(thumbOf({ clientHeight: 280, scrollHeight: 50_000, scrollTop: 0 }, 24).size).toBe(24); // the minimum
  expect(thumbOf({ clientHeight: 280, scrollHeight: 280.5, scrollTop: 0 }, 24).on).toBe(false);
  const m = { clientHeight: 280, scrollHeight: 1176, scrollTop: 0 };
  expect(Math.round(dragScroll(100, 10, m, 67) * 1e6)).toBe(
    Math.round((100 + (10 * 896) / 213) * 1e6),
  ); // track px → content px
  expect([dragScroll(100, -999, m, 67), dragScroll(100, 999, m, 67)]).toEqual([0, 896]);
  expect(dragScroll(5, 10, { ...m, scrollHeight: 280 }, 280)).toBe(5);
});

type Ev = { clientY: number; button: number; pointerId: number; preventDefault: () => void };
const ev = (clientY: number, button = 0): Ev => ({
  clientY,
  button,
  pointerId: 7,
  preventDefault: () => undefined,
});

test("B2-r: the bar repaints once a frame after scroll or resize; the thumb drags with pointer capture", () => {
  const heard = new Map<string, () => void>();
  const zone = {
    clientHeight: 280,
    scrollHeight: 1176,
    scrollTop: 0,
    firstElementChild: {},
    addEventListener: (t: string, fn: () => void) => heard.set(t, fn),
    removeEventListener: (t: string) => heard.delete(t),
  };
  const props = new Map<string, string>();
  const bar = {
    hidden: true as boolean | string,
    style: { setProperty: (k: string, v: string) => props.set(k, v) },
  };
  const queued: (() => void)[] = [];
  let resized: (() => void) | undefined;
  const stop = watchBar(
    zone,
    bar,
    () => 24,
    { request: (fn) => queued.push(fn), cancel: () => undefined },
    (_, fn) => {
      resized = fn;
      return () => undefined;
    },
  );
  expect([bar.hidden, props.get("--dyn-th"), props.get("--dyn-ty")]).toEqual([
    false,
    "67px",
    "0px",
  ]);
  zone.scrollTop = 896;
  heard.get("scroll")?.();
  resized?.();
  expect(queued.length).toBe(1); // coalesced into one frame
  for (const run of queued.splice(0)) run();
  expect(props.get("--dyn-ty")).toBe("213px");
  stop();
  expect(heard.has("scroll")).toBe(false);
  // Drag: down 21.3 track px from the top = 89.6 content px.
  const grip = new Map<string, (e: Ev) => void>();
  const captured: number[] = [];
  const held: boolean[] = [];
  zone.scrollTop = 0;
  const undrag = dragThumb(
    {
      addEventListener: (t: string, fn: (e: Ev) => void) => grip.set(t, fn),
      removeEventListener: (t: string) => grip.delete(t),
      setPointerCapture: (id: number) => captured.push(id),
    },
    zone,
    () => 24,
    (on) => held.push(on),
  );
  grip.get("pointermove")?.(ev(50)); // no press yet: nothing moves
  grip.get("pointerdown")?.(ev(100, 2)); // not the main button
  expect(zone.scrollTop).toBe(0);
  grip.get("pointerdown")?.(ev(100));
  grip.get("pointermove")?.(ev(121.3));
  expect(Math.round(zone.scrollTop * 1e6)).toBe(Math.round(((21.3 * 896) / 213) * 1e6));
  grip.get("pointerup")?.(ev(121.3));
  grip.get("pointercancel")?.(ev(121.3));
  expect([captured, held]).toEqual([[7], [true, false]]);
  undrag();
  expect(grip.size).toBe(0);
  expect([
    watchBar(null, bar, () => 0, { request: () => 0, cancel: () => undefined })(),
    dragThumb(
      null,
      zone,
      () => 0,
      () => undefined,
    )(),
  ]).toEqual([undefined, undefined]);
});

test("Form 9c: Tab scrolls by the minimum from where the pane was, never to the browser's centring", () => {
  // 390: zone 115.5–832 (band 139.5–808 with no pinned header); content y → screen y − scrollTop.
  const heard = new Map<string, (e: { target: unknown }) => void>();
  const zone = {
    scrollTop: 0,
    getBoundingClientRect: () => ({ top: 115.5, bottom: 832 }),
    addEventListener: (type: string, fn: (e: { target: unknown }) => void) => heard.set(type, fn),
    removeEventListener: (type: string) => heard.delete(type),
  };
  const queued: (() => void)[] = [];
  const frames = { request: (fn: () => void) => queued.push(fn), cancel: () => undefined };
  const at = (y: number, h = 20) => ({
    matches: () => true,
    closest: () => null,
    contains: () => false,
    getBoundingClientRect: () => ({
      top: 115.5 + y - zone.scrollTop,
      bottom: 115.5 + y + h - zone.scrollTop,
      height: h,
    }),
  });
  keepFocusClear(
    zone,
    () => 24,
    frames,
    () => 4,
  );
  const settle = (to: number): void => {
    zone.scrollTop = to;
    heard.get("scroll")?.({ target: zone });
  };
  const tab = (el: ReturnType<typeof at>, centred: number, after = false): number => {
    if (!after) zone.scrollTop = centred; // Chromium, Firefox: moved before focusin
    heard.get("focusin")?.({ target: el });
    if (after) zone.scrollTop = centred; // WebKit: moved after focusin, before the frame
    heard.get("scroll")?.({ target: zone }); // the focus scroll's event comes after focusin
    for (const run of queued.splice(0)) run();
    return zone.scrollTop;
  };
  settle(100);
  // Foot 30px under the band at 100: the minimum is 100 + 30 + the 4px ring; centred was 600.
  const below = at(808 + 30 - 20 - 115.5 + 100);
  const want = 100 + Math.ceil(30 + 4);
  expect(tab(below, 600)).toBe(want);
  settle(want);
  // Shift+Tab to one 50px above the band: up by its overhang plus the ring, not to the centre.
  const above = at(want + 139.5 - 50 - 115.5);
  expect(tab(above, 40, true)).toBe(want + Math.floor(-50 - 4));
  settle(zone.scrollTop);
  // A control already in the band: the browser leaves it, and so does the correction.
  const inside = at(zone.scrollTop + 300);
  const before = zone.scrollTop;
  expect(tab(inside, before)).toBe(before);
});

const rect = (top: number, h: number) => ({ top, bottom: top + h, height: h });

test("R6 F1b: Shift+Tab to the open header clears its ring of the top fade from its own place, not where it is pinned", () => {
  // 1440: zone 115.5–832, fade 24; the head is 50.44 tall, the toggle 4px into it, the ring 4px.
  const Z = 115.5;
  const heard = new Map<string, (e: { target: unknown }) => void>();
  let st = 0;
  const zone = {
    get scrollTop() {
      return st;
    },
    set scrollTop(v: number) {
      st = Math.max(0, v); // the browser clamps at the top
    },
    getBoundingClientRect: () => ({ top: Z, bottom: 832 }),
    addEventListener: (type: string, fn: (e: { target: unknown }) => void) => heard.set(type, fn),
    removeEventListener: (type: string) => heard.delete(type),
  };
  let assetAt = 0; // the asset's top in content px
  const headTop = (): number => Math.max(Z + assetAt - st, Z); // sticky at the zone's top
  const asset = {
    querySelector: () => head,
    getBoundingClientRect: () => rect(Z + assetAt - st, 900),
  };
  const head = {
    matches: () => true,
    closest: () => asset,
    contains: (el: unknown) => el === toggle,
    getBoundingClientRect: () => rect(headTop(), 50.44),
  };
  const toggle = {
    ...head,
    contains: () => false,
    getBoundingClientRect: () => rect(headTop() + 4, 46.44),
  };
  const queued: (() => void)[] = [];
  keepFocusClear(
    zone,
    () => 24,
    { request: (fn) => queued.push(fn), cancel: () => undefined },
    () => 4,
  );
  const back = (from: number, browser: number): number => {
    st = from;
    heard.get("scroll")?.({ target: zone }); // rests at `from`
    st = browser; // the browser's own focus scroll (Chromium/WebKit: to 0; Firefox: none)
    heard.get("focusin")?.({ target: toggle });
    for (const run of queued.splice(0)) run();
    return st;
  };
  // Bitcoin, pinned at 15 (its ring's foot 4px into the fade at 50.44): back to the top, no fade.
  expect([back(15, 0), back(15, 15)]).toEqual([0, 0]);
  // A lower asset pinned deep: it comes to rest just under the top fade, unpinned (the minimum).
  assetAt = 300;
  expect(back(400, 300)).toBe(300 - 24);
  expect(back(290, 290)).toBe(300 - 24); // not stuck, its ring 10px down: in the fade, out by 14
  expect(back(250, 250)).toBe(250); // not stuck, its ring 50px down: clear, no move
});
