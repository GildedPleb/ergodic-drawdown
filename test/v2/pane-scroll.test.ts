import { file } from "bun";
import { expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PaneScroll } from "../../src/v2/app/shell/PaneScroll";
import { REVEAL } from "../../src/v2/design/primitives/Select/logic";
import {
  cuesOf,
  focusShift,
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

test("1MP 11: the pane renders the zone alone: no edge-line elements, data-pane on the zone", () => {
  const html = renderToStaticMarkup(createElement(PaneScroll, { id: "models", children: "x" }));
  expect(html.includes("aria-hidden")).toBe(false);
  expect(/data-pane="models"[^>]*style="--dyn-hh:0px"/.test(html)).toBe(true);
  expect((html.match(/<div/g) ?? []).length).toBe(3);
});

test("1MP 11–12: fades by mask (zero unless flagged), the scrollbar column unmasked, no edge lines", async () => {
  const pane = await file(`${v2}/app/shell/PaneScroll.module.css`).text();
  expect(/\.rule|\.foot|border/.test(pane)).toBe(false);
  expect(pane.includes("mask:")).toBe(true);
  expect(/\[data-top="true"\] \{\s*--_ft: var\(--s-6\);/.test(pane)).toBe(true);
  expect(/\[data-more="true"\] \{\s*--_fb: var\(--s-6\);/.test(pane)).toBe(true);
  expect(pane.includes("scrollbar-gutter: stable;")).toBe(true);
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
    closest: () => ({ querySelector: () => header }),
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
