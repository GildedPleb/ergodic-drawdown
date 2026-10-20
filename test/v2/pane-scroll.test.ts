import { file } from "bun";
import { expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PaneScroll } from "../../src/v2/app/shell/PaneScroll";
import {
  cuesOf,
  paintCues,
  resizeWith,
  watchCues,
  type Zone,
} from "../../src/v2/app/shell/pane-cues";

// V32-BUILD §1Y: a dock pane's scroll zone, its Deco rules and cues (no fades anywhere).
const v2 = `${import.meta.dir}/../../src/v2`;

type Flags = { dataset: Record<string, string | undefined> };
type FakeRow = Flags & { getBoundingClientRect: () => { top: number } };

const fakeZone = (
  over: Partial<{ scrollTop: number; scrollHeight: number; clientHeight: number }> = {},
  rows: FakeRow[] = [],
  openTop: number | null = null,
): Zone<unknown> & { fire: () => void; listening: () => boolean } => {
  let fn: (() => void) | null = null;
  const open: FakeRow | null =
    openTop === null ? null : { dataset: {}, getBoundingClientRect: () => ({ top: openTop }) };
  const all = open === null ? rows : [...rows, open];
  return {
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 400,
    ...over,
    firstElementChild: "content",
    getBoundingClientRect: () => ({ top: 100 }),
    querySelector: (sel) => (sel === '[data-state="open"]' ? open : null),
    querySelectorAll: () => all.filter((r) => r.dataset["stuck"] !== undefined),
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

test("1Y: ▲ only once scrolled, ▼ only while more is below (a sub-pixel remainder is not more)", () => {
  expect(cuesOf(fakeZone())).toEqual({ top: false, more: true, stuck: false });
  expect(cuesOf(fakeZone({ scrollTop: 300 }))).toEqual({ top: true, more: true, stuck: false });
  expect(cuesOf(fakeZone({ scrollTop: 600 }))).toEqual({ top: true, more: false, stuck: false });
  expect(cuesOf(fakeZone({ scrollTop: 599.5 })).more).toBe(false);
  expect(cuesOf(fakeZone({ scrollTop: 598 })).more).toBe(true);
  // Content that fits: neither cue.
  expect(cuesOf(fakeZone({ scrollHeight: 400 }))).toEqual({
    top: false,
    more: false,
    stuck: false,
  });
});

test("1Y: the open header is stuck once its row's top has passed the zone's top", () => {
  expect(cuesOf(fakeZone({ scrollTop: 50 }, [], 100)).stuck).toBe(false);
  expect(cuesOf(fakeZone({ scrollTop: 50 }, [], 99.6)).stuck).toBe(false);
  expect(cuesOf(fakeZone({ scrollTop: 50 }, [], 40)).stuck).toBe(true);
});

test("1Y: paint writes the pane's flags and moves data-stuck to the open row only", () => {
  const pane: Flags = { dataset: {} };
  const old: FakeRow = { dataset: { stuck: "true" }, getBoundingClientRect: () => ({ top: 0 }) };
  const zone = fakeZone({ scrollTop: 200 }, [old], 20);
  expect(paintCues(pane, zone)).toEqual({ top: true, more: true, stuck: true });
  expect(pane.dataset).toEqual({ top: "true", more: "true" });
  expect(old.dataset["stuck"]).toBe(undefined);
  expect(zone.querySelector('[data-state="open"]')?.dataset["stuck"]).toBe("true");
  // Back at the top: nothing stuck, ▲ gone.
  const top = fakeZone({}, [], 150);
  paintCues(pane, top);
  expect(pane.dataset).toEqual({ top: "false", more: "true" });
  expect(top.querySelector('[data-state="open"]')?.dataset["stuck"]).toBe(undefined);
});

test("1Y: watch paints now, on scroll and on resize of the zone and its content; detach stops both", () => {
  const pane: Flags = { dataset: {} };
  const zone = fakeZone();
  let watched: unknown[] = [];
  let resize: (() => void) | null = null;
  let disconnected = false;
  const stop = watchCues(zone, pane, (els, fn) => {
    watched = els;
    resize = fn;
    return () => {
      disconnected = true;
    };
  });
  expect(pane.dataset["top"]).toBe("false");
  expect(watched.length).toBe(2);
  zone.scrollTop = 600;
  zone.fire();
  expect(pane.dataset).toEqual({ top: "true", more: "false" });
  zone.scrollHeight = 2000;
  (resize as (() => void) | null)?.();
  expect(pane.dataset["more"]).toBe("true");
  stop();
  expect(zone.listening()).toBe(false);
  expect(disconnected).toBe(true);
  // No zone (not mounted) or no ResizeObserver: no-ops.
  watchCues(null, pane)();
  const bare = fakeZone();
  watchCues(bare, pane)();
  expect(bare.listening()).toBe(false);
});

test("1Y: resizeWith wraps a ResizeObserver over every element; none without one", () => {
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

test("1Y: the pane renders rule, zone and foot; rules are aria-hidden, the zone carries data-pane", () => {
  const html = renderToStaticMarkup(createElement(PaneScroll, { id: "models", children: "x" }));
  expect(html.match(/aria-hidden="true"/g)?.length).toBe(2);
  expect(html.includes('data-pane="models"')).toBe(true);
});

test("1Y: no gradient or fade anywhere in the pane's CSS; cues instant, no pointer events", async () => {
  const paths = [
    "app/shell/PaneScroll.module.css",
    "app/shell/AppShell.module.css",
    "app/models/ModelsSheet.module.css",
    "design/primitives/AssetRow/AssetRow.module.css",
    "design/primitives/SectionLabel/SectionLabel.module.css",
    "design/primitives/LedgerRow/LedgerRow.module.css",
    "design/primitives/TickToggle/TickToggle.module.css",
    "design/primitives/Select/Select.module.css",
    "design/primitives/NumberField/NumberField.module.css",
    "design/primitives/Slider/Slider.module.css",
  ];
  for (const p of paths) {
    const css = await file(`${v2}/${p}`).text();
    expect(/gradient\(|mask-image/.test(css)).toBe(false);
  }
  const pane = await file(`${v2}/app/shell/PaneScroll.module.css`).text();
  expect(/transition|animation/.test(pane)).toBe(false);
  expect(pane.includes("pointer-events: none;")).toBe(true);
  expect(pane.includes("overflow-y: auto;")).toBe(true);
  expect(pane.includes("overscroll-behavior: contain;")).toBe(true);
  expect(pane.includes("scroll-padding-block-start: var(--hit);")).toBe(true);
  const row = await file(`${v2}/design/primitives/AssetRow/AssetRow.module.css`).text();
  expect(row.includes("position: sticky;")).toBe(true);
  expect(/\[data-state="open"\] \.summary \{\s*display: none;/.test(row)).toBe(true);
});
