import { expect, test } from "bun:test";

import {
  animateDomain,
  clampView,
  followDomain,
  fullView,
  isZoomed,
  MIN_SAMPLES,
  panBy,
  type View,
  viewBox,
  windowDomain,
  windowRange,
  Y_EASE_MS,
  zoomAt,
} from "../../src/v2/app/world/zoom";
import {
  gestureView,
  KEY_PAN,
  KEY_ZOOM,
  keyView,
  wheelView,
  attachZoom,
  plotTarget,
} from "../../src/v2/app/world/zoom-input";
import { fitDomain, lx } from "../../src/v2/app/world/geometry";

// V32-BUILD §1T: the zoom window clamp, as a pure function under property tests.

const near = (a: number, b: number): void => {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-6);
};

/** A seeded PRNG (mulberry32): property runs are repeatable. */
const rng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const inBounds = (v: View, last: number): boolean => {
  const span = v.to - v.from;
  return (
    v.from >= -1e-9 &&
    v.to <= last + 1e-9 &&
    span <= last + 1e-9 &&
    span >= Math.min(MIN_SAMPLES - 1, last) - 1e-9 &&
    Number.isFinite(v.from) &&
    Number.isFinite(v.to)
  );
};

test("1T property: any window, however wild, clamps inside the data, no wider, 8 samples or more", () => {
  const r = rng(7);
  const wild = (): number => {
    const k = r();
    if (k < 0.05) return Number.NaN;
    if (k < 0.1) return Number.POSITIVE_INFINITY;
    if (k < 0.15) return Number.NEGATIVE_INFINITY;
    return (r() - 0.3) * 1e5;
  };
  for (let i = 0; i < 4000; i++) {
    const last = r() < 0.1 ? Math.floor(r() * 10) : Math.floor(r() * 3000) + 1;
    const v = clampView({ from: wild(), to: wild() }, last);
    expect(inBounds(v, last)).toBe(true);
    // Idempotent.
    expect(clampView(v, last)).toEqual(v);
  }
});

test("1T property: random wheel, pan, pinch and key sequences never leave the bounds", () => {
  const r = rng(11);
  const plot = { left: 34, right: 1396 };
  for (let run = 0; run < 300; run++) {
    const last = Math.floor(r() * 2000) + 8;
    let v = fullView(last);
    for (let step = 0; step < 60; step++) {
      const k = r();
      if (k < 0.25) v = zoomAt(v, r() * 4, r() * 1.4 - 0.2, last);
      else if (k < 0.5) v = panBy(v, (r() - 0.5) * last * 3, last);
      else if (k < 0.7)
        v = wheelView(
          v,
          last,
          {
            deltaX: r() < 0.3 ? (r() - 0.5) * 2000 : 0,
            deltaY: (r() - 0.5) * 3000,
            deltaMode: Math.floor(r() * 3),
            shiftKey: r() < 0.2,
            ctrlKey: r() < 0.2,
            clientX: r() * 1600 - 100,
          },
          plot,
        );
      else if (k < 0.85)
        v = gestureView(
          v,
          last,
          [
            { x: r() * 1400, y: 10 },
            { x: r() * 1400, y: 50 },
          ],
          [
            { x: r() * 1400, y: 10 },
            { x: r() * 1400, y: 50 },
          ],
          plot,
        );
      else
        v =
          keyView(
            v,
            last,
            ["+", "-", "ArrowLeft", "ArrowRight", "0", "\u2212", "="][Math.floor(r() * 7)] ?? "0",
          ) ?? v;
      expect(inBounds(v, last)).toBe(true);
    }
  }
});

test("1T: zoom-out stops at the full data; zoom-in stops at 8 samples; the pointer's sample stays put", () => {
  const last = 1560;
  let v = fullView(last);
  for (let i = 0; i < 50; i++) v = zoomAt(v, 3, 0.3, last);
  expect(v).toEqual({ from: 0, to: last });
  for (let i = 0; i < 50; i++) v = zoomAt(v, 0.2, 0.25, last);
  expect(v.to - v.from).toBe(MIN_SAMPLES - 1);
  const mid = zoomAt({ from: 100, to: 300 }, 0.5, 0.25, last);
  expect(mid).toEqual({ from: 125, to: 225 }); // sample 150 stays a quarter in
  expect(isZoomed(mid, last)).toBe(true);
  expect(isZoomed(fullView(last), last)).toBe(false);
  // A horizon shorter than 8 samples can't zoom in at all.
  expect(zoomAt(fullView(5), 0.1, 0.5, 5)).toEqual({ from: 0, to: 5 });
  expect(zoomAt({ from: 0, to: 100 }, 0, Number.NaN, last)).toEqual({ from: 0, to: 100 });
});

test("1T: pan is hard-clamped at both ends (no overscroll)", () => {
  const last = 1000;
  expect(panBy({ from: 100, to: 200 }, 5000, last)).toEqual({ from: 900, to: 1000 });
  expect(panBy({ from: 100, to: 200 }, -5000, last)).toEqual({ from: 0, to: 100 });
  expect(panBy({ from: 100, to: 200 }, Number.NaN, last)).toEqual({ from: 100, to: 200 });
});

test("1T: Y fits the visible window's p1–p99 plus 5%, finite values only", () => {
  const p1 = Float64Array.from([1, 2, 4, 8, Number.NaN, 32]);
  const p99 = Float64Array.from([10, 20, 40, 80, Number.POSITIVE_INFINITY, 320]);
  expect(windowRange({ p1, p99 }, { from: 1.2, to: 3.4 })).toEqual({ low: 2, high: 80 });
  expect(windowDomain({ p1, p99 }, { from: 1, to: 3 })).toEqual(fitDomain(2, 80));
  expect(windowRange({ p1, p99 }, { from: 4, to: 4 })).toEqual(null);
  expect(windowDomain({ p1, p99 }, { from: 4, to: 4 })).toEqual(null);
});

test("1T: the widened box puts the window's ends on the plot's edges", () => {
  const box = { L: 34, R: 1396, T: 18, Bt: 600 };
  const wide = viewBox(box, { from: 200, to: 400 }, 1000);
  near(lx(200, wide, 1000), 34);
  near(lx(400, wide, 1000), 1396);
  expect(wide.T).toBe(18);
  expect(viewBox(box, { from: 3, to: 3 }, 1000)).toBe(box);
});

test("1T: Y eases over 150ms in log space and lands exactly; 0ms lands in one frame; cancel stops it", () => {
  expect(Y_EASE_MS).toBe(150);
  const queue: ((t: number) => void)[] = [];
  const frames = {
    request: (fn: (t: number) => void) => queue.push(fn),
    cancel: () => {
      queue.length = 0;
    },
  };
  const shown: { lo: number; hi: number }[] = [];
  animateDomain({ lo: 1, hi: 100 }, { lo: 10, hi: 1000 }, 150, (d) => shown.push(d), frames);
  for (const t of [1000, 1075, 1150]) queue.shift()?.(t);
  expect(shown[0]).toEqual({ lo: 1, hi: 100 });
  expect(shown[1]?.lo ?? 0).toBeGreaterThanOrEqual(1);
  expect(shown[1]?.lo ?? 99).toBeLessThanOrEqual(10);
  expect(shown.at(-1)).toEqual({ lo: 10, hi: 1000 });
  expect(queue.length).toBe(0);
  shown.length = 0;
  animateDomain({ lo: 1, hi: 100 }, { lo: 10, hi: 1000 }, 0, (d) => shown.push(d), frames);
  queue.shift()?.(5);
  expect(shown).toEqual([{ lo: 10, hi: 1000 }]);
  const stop = animateDomain(
    { lo: 1, hi: 100 },
    { lo: 10, hi: 1000 },
    150,
    (d) => shown.push(d),
    frames,
  );
  stop();
  expect(queue.length).toBe(0);
});

test("1T inputs: wheel zooms at the pointer; Shift, horizontal or line/page deltas pan; ctrl is a pinch", () => {
  const plot = { left: 0, right: 1000 };
  const v = { from: 0, to: 1000 };
  const base = { deltaX: 0, deltaMode: 0, shiftKey: false, ctrlKey: false, clientX: 250 };
  const zin = wheelView(v, 1000, { ...base, deltaY: -100 }, plot);
  near(zin.to - zin.from, 800);
  near(zin.from, 50); // 250 stays a quarter in
  const pan = wheelView(
    { from: 100, to: 200 },
    1000,
    { ...base, deltaY: 500, shiftKey: true },
    plot,
  );
  expect(pan).toEqual({ from: 150, to: 250 });
  const sideways = wheelView(
    { from: 100, to: 200 },
    1000,
    { ...base, deltaX: -1000, deltaY: 10 },
    plot,
  );
  expect(sideways).toEqual({ from: 0, to: 100 });
  const lines = wheelView(
    { from: 100, to: 200 },
    1000,
    { ...base, deltaY: 10, deltaMode: 1, shiftKey: true },
    plot,
  );
  near(lines.from, 116);
  const page = wheelView(
    { from: 100, to: 200 },
    1000,
    { ...base, deltaY: 1, deltaMode: 2, shiftKey: true },
    plot,
  );
  expect(page).toEqual({ from: 200, to: 300 });
  const pinch = wheelView(v, 1000, { ...base, deltaY: -50, ctrlKey: true, shiftKey: true }, plot);
  near(pinch.to - pinch.from, 1000 * Math.exp(-0.5));
});

test("1T inputs: + − ← → 0 and nothing else", () => {
  const v = { from: 100, to: 400 };
  expect(keyView(v, 1000, "+")).toEqual(zoomAt(v, 1 / KEY_ZOOM, 0.5, 1000));
  expect(keyView(v, 1000, "-")).toEqual(zoomAt(v, KEY_ZOOM, 0.5, 1000));
  expect(keyView(v, 1000, "ArrowLeft")).toEqual({
    from: 100 - 300 * KEY_PAN,
    to: 400 - 300 * KEY_PAN,
  });
  expect(keyView(v, 1000, "ArrowRight")).toEqual({
    from: 100 + 300 * KEY_PAN,
    to: 400 + 300 * KEY_PAN,
  });
  expect(keyView(v, 1000, "0")).toEqual({ from: 0, to: 1000 });
  expect(keyView(v, 1000, "a")).toBe(null);
});

test("1T inputs: a drag pans against the pointer; two fingers pinch about their midpoint", () => {
  const plot = { left: 0, right: 1000 };
  const start = { from: 100, to: 300 };
  expect(gestureView(start, 1000, [{ x: 500, y: 0 }], [{ x: 400, y: 0 }], plot)).toEqual({
    from: 120,
    to: 320,
  });
  expect(gestureView(start, 1000, [], [], plot)).toBe(start);
  const out = gestureView(
    start,
    1000,
    [
      { x: 400, y: 0 },
      { x: 600, y: 0 },
    ],
    [
      { x: 450, y: 0 },
      { x: 550, y: 0 },
    ],
    plot,
  );
  near(out.to - out.from, 400); // fingers together: zoom out ×2
  expect(
    gestureView(
      start,
      1000,
      [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ],
      [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ],
      plot,
    ),
  ).toEqual(start);
});

type Listener = (e: Event) => void;

test("1T inputs wired: wheel, drag with the grabbing cursor, pinch, double-click and keys; detach", () => {
  const listeners = new Map<string, Listener>();
  const captured: number[] = [];
  const el = {
    addEventListener: (type: string, fn: Listener) => {
      listeners.set(type, fn);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
    dispatchEvent: () => true,
    setPointerCapture: (id: number) => {
      captured.push(id);
    },
  };
  const style = new Map<string, string>();
  const root = {
    style: {
      setProperty: (k: string, v: string) => {
        style.set(k, v);
      },
      removeProperty: (k: string) => {
        style.delete(k);
      },
    },
  };
  let view: View = { from: 0, to: 1000 };
  let last = 1000;
  const detach = attachZoom(el, {
    view: () => view,
    last: () => last,
    set: (v) => {
      view = v;
    },
    plot: () => ({ left: 0, right: 1000 }),
    root,
  });
  let prevented = 0;
  const fire = (type: string, init: Record<string, unknown>): void => {
    const e = Object.assign(new Event(type), init, {
      preventDefault: () => {
        prevented += 1;
      },
    });
    listeners.get(type)?.(e);
  };
  fire("wheel", { deltaY: -100, clientX: 500 });
  near(view.to - view.from, 800);
  // A full-view drag does nothing; a zoomed one pans and shows grabbing until release.
  fire("pointerdown", { pointerId: 1, button: 0, clientX: 500, clientY: 10 });
  expect(style.get("cursor")).toBe("var(--cursor-drag)");
  const before = view;
  fire("pointermove", { pointerId: 1, clientX: 400, clientY: 10 });
  near(view.from, before.from + 80);
  fire("pointermove", { pointerId: 9, clientX: 0 });
  fire("pointerup", { pointerId: 1 });
  expect(style.has("cursor")).toBe(false);
  fire("pointerup", { pointerId: 1 });
  expect(captured).toEqual([1]);
  // Pinch out with two fingers.
  fire("pointerdown", { pointerId: 2, button: 0, clientX: 400, clientY: 0 });
  fire("pointerdown", { pointerId: 3, button: 0, clientX: 600, clientY: 0 });
  fire("pointermove", { pointerId: 3, clientX: 10_000, clientY: 0 });
  fire("pointercancel", { pointerId: 2 });
  fire("pointercancel", { pointerId: 3 });
  expect(view.from).toBeGreaterThanOrEqual(0);
  fire("keydown", { key: "+" });
  fire("keydown", { key: "q" });
  fire("keydown", {});
  fire("dblclick", {});
  expect(view).toEqual({ from: 0, to: 1000 });
  // From full, a drag shows no grabbing (there is nothing to pan).
  fire("pointerdown", { pointerId: 4, button: 0, clientX: 1, clientY: 1 });
  expect(style.has("cursor")).toBe(false);
  fire("pointermove", { pointerId: 4, clientX: 50, clientY: 1 });
  expect(view).toEqual({ from: 0, to: 1000 });
  fire("pointerup", { pointerId: 4 });
  fire("pointerdown", { pointerId: 5, button: 2 });
  // A pointer the browser no longer tracks can't be captured; the gesture carries on.
  el.setPointerCapture = () => {
    throw new Error("NotFoundError");
  };
  fire("pointerdown", { pointerId: 7, button: 0, clientX: 1, clientY: 1 });
  fire("pointerup", { pointerId: 7 });
  // Nothing to zoom while there is no data.
  last = 0;
  fire("wheel", { deltaY: -100 });
  fire("keydown", { key: "+" });
  fire("dblclick", {});
  fire("pointerdown", { pointerId: 6, button: 0 });
  expect(view).toEqual({ from: 0, to: 1000 });
  expect(prevented).toBeGreaterThanOrEqual(3);
  detach();
  expect(listeners.size).toBe(0);
});

test("1T: Y slides only when the window moved; a new engine run, a first draw or reduced motion land at once", () => {
  const queue: ((t: number) => void)[] = [];
  const frames = {
    request: (fn: (t: number) => void) => queue.push(fn),
    cancel: () => {
      queue.length = 0;
    },
  };
  const seen: unknown[] = [];
  const a = { lo: 1, hi: 10 };
  const b = { lo: 2, hi: 20 };
  followDomain({ moved: false, from: a, target: b, still: false }, (d) => seen.push(d), frames)();
  followDomain(
    { moved: true, from: undefined, target: b, still: false },
    (d) => seen.push(d),
    frames,
  );
  followDomain(
    { moved: true, from: a, target: undefined, still: false },
    (d) => seen.push(d),
    frames,
  );
  expect(seen).toEqual([b, b, undefined]);
  expect(queue.length).toBe(0);
  followDomain({ moved: true, from: a, target: b, still: true }, (d) => seen.push(d), frames);
  queue.shift()?.(0);
  expect(seen.at(-1)).toEqual(b);
  followDomain({ moved: true, from: a, target: b, still: false }, (d) => seen.push(d), frames);
  queue.shift()?.(0);
  expect(queue.length).toBe(1);
});

test("1T: the plot target reads the live window, stores a full window as null, and finds the plot's edges", () => {
  const stored: unknown[] = [];
  const state = { current: { view: { from: 10, to: 20 }, last: 100 } };
  const root = { style: { setProperty: () => undefined, removeProperty: () => undefined } };
  const t = plotTarget(
    { getBoundingClientRect: () => ({ left: 100, width: 500, height: 300 }) },
    state,
    (v) => stored.push(v),
    (w) => ({ L: 34, R: w - 44 }),
    root,
  );
  expect(t.view()).toEqual({ from: 10, to: 20 });
  expect(t.last()).toBe(100);
  t.set({ from: 0, to: 100 });
  t.set({ from: 5, to: 50 });
  expect(stored).toEqual([null, { from: 5, to: 50 }]);
  expect(t.plot()).toEqual({ left: 134, right: 556 });
  expect(t.root).toBe(root);
});
