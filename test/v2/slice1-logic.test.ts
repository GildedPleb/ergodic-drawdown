import {
  FLICK,
  gesture,
  isTap,
  RUBBER,
  rubberBand,
  snapStop,
  stopsFor,
  tapStop,
  keyStop,
  dirOf,
  toggleStop,
  velocity,
} from "../../src/v2/app/shell/drag";
import type { Dir, Stop } from "../../src/v2/app/shell/drag";
import { strings } from "../../src/v2/app/strings";
import { attachDrag } from "../../src/v2/app/shell/attachDrag";
import { fullOf, ownsTap } from "../../src/v2/app/shell/useSheetDrag";
import { dockLayout, paneOf, returnFocus } from "../../src/v2/app/shell/panes";
import { expect, test } from "bun:test";

import type { EngineConfig } from "../../src/engine/keys";
import { coalesce } from "../../src/v2/app/engine/coalesce";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  fetchInputs,
  INPUTS_RETRY_MS,
  INPUTS_TIMEOUT_MS,
  type InputsIO,
  type InputsPhase,
  LOADING_HOLD_MS,
  type Timers,
  watchInputs,
} from "../../src/v2/app/engine/inputs";
import { WorldLayer } from "../../src/v2/app/world/WorldLayer";
import { engineConfig, type WorldInputs } from "../../src/v2/app/engine/config";
import { defaultModelsValues } from "../../src/v2/app/models/values";
import { keyStep } from "../../src/v2/design/primitives/Slider/Slider";
import {
  BREAK,
  focusScale,
  linearScale,
  snapTo,
} from "../../src/v2/design/primitives/Slider/scale";

const LIN = linearScale(0, 1, 0.01);
const VOL = { min: 0, max: 1, step: 0.01, scale: LIN };

test("slider: a linear track snaps to the step and clamps to the bounds without float dust", () => {
  expect(snapTo(0.304_999, 0, 0.01)).toBe(0.3);
  expect([LIN.toValue(0.25), LIN.toValue(1.7), LIN.toValue(-3)]).toEqual([0.25, 1, 0]);
  expect([LIN.toPos(0.5), LIN.toPos(2), LIN.breakAt]).toEqual([0.5, 1, null]);
});

test("slider: arrows step, Page keys step ×10, Home/End jump, other keys are not ours", () => {
  expect(keyStep("ArrowRight", 0.5, VOL)).toBe(0.51);
  expect(keyStep("ArrowDown", 0.5, VOL)).toBe(0.49);
  expect(keyStep("PageUp", 0.5, VOL)).toBe(0.6);
  expect(keyStep("PageDown", 0.05, VOL)).toBe(0);
  expect(keyStep("Home", 0.5, VOL)).toBe(0);
  expect(keyStep("End", 0.5, VOL)).toBe(1);
  expect(keyStep("a", 0.5, VOL)).toBe(null);
});

// §1Q: R (%) — focus range 0–50 (step 1) on the first 80%, log to the soft top (main's rangeMax).
const R = focusScale(0, { focusTop: 50, softTop: 1000, step: 1 });
const RKEYS = { min: 0, max: Infinity, step: 1, scale: R };
/** A seeded PRNG (mulberry32): property runs are repeatable. */
const rng = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

test("1Q property: position→value is monotonic, endpoints exact, continuous at the 80% break", () => {
  const next = rng(1);
  const ps = Array.from({ length: 400 }, () => next()).toSorted((a, b) => a - b);
  const vs = ps.map((p) => R.toValue(p));
  expect(vs.every((v, i) => i === 0 || v >= (vs[i - 1] ?? 0))).toBe(true);
  expect([R.toValue(0), R.toValue(BREAK), R.toValue(1)]).toEqual([0, 50, 1000]);
  expect([R.toPos(0), R.toPos(50), R.toPos(1000)]).toEqual([0, BREAK, 1]);
  // Continuous: just either side of the break, the value moves by at most one step.
  const e = 1e-9;
  expect(Math.abs(R.toValue(BREAK + e) - R.toValue(BREAK - e)) <= 1).toBe(true);
  expect(Math.abs(R.toPos(50 + 1e-6) - R.toPos(50 - 1e-6)) < 1e-6).toBe(true);
});

test("1Q property: value→position→value round-trips within one step; the focus range is linear", () => {
  const next = rng(2);
  for (let i = 0; i < 400; i += 1) {
    const v = Math.round(next() * 1000);
    const back = R.toValue(R.toPos(v));
    const step = v <= 50 ? 1 : R.stepAt(v, true);
    expect(`${String(v)}:${String(Math.abs(back - v) <= step)}`).toBe(`${String(v)}:true`);
  }
  // Dragging across the first 80% covers 0–50 in steps of 1: every whole value is reachable.
  const seen = new Set<number>();
  for (let px = 0; px <= 800; px += 1) seen.add(R.toValue(px / 1000));
  expect([...seen].toSorted((a, b) => a - b)).toEqual(Array.from({ length: 51 }, (_, k) => k));
});

test("1Q: typed 5000 is kept and pins the thumb; arrows step 1 inside the focus range", () => {
  expect(R.toPos(5000)).toBe(1);
  expect([keyStep("ArrowUp", 28, RKEYS), keyStep("ArrowDown", 28, RKEYS)]).toEqual([29, 27]);
  expect([keyStep("ArrowDown", 50, RKEYS), keyStep("ArrowUp", 49, RKEYS)]).toEqual([49, 50]);
  // Above the focus range: about 5% of the value; Page keys 10; never below 0; 5000 steps down.
  expect([keyStep("ArrowUp", 200, RKEYS), keyStep("PageUp", 28, RKEYS)]).toEqual([210, 38]);
  expect([keyStep("PageDown", 3, RKEYS), keyStep("ArrowDown", 5000, RKEYS)]).toEqual([0, 4750]);
  expect([keyStep("Home", 300, RKEYS), keyStep("End", 3, RKEYS)]).toEqual([0, 1000]);
});

const io = (saved: string[][]): InputsIO => ({
  price: async () => ({ close: 100_000 }),
  height: async () => 840_100,
  block: async (h) => h,
  interim: async () => [],
  load: () => ({ "210000": 1 }),
  save: (d) => {
    saved.push(Object.keys(d));
  },
});

test("inputs: price, block + halvings and interim each merge; only missing halvings are fetched", async () => {
  const saved: string[][] = [];
  const got: Partial<WorldInputs> = {};
  await fetchInputs(1, (p) => Object.assign(got, p), io(saved));
  expect(got.currentPrice).toBe(100_000);
  expect(got.currentBlock).toBe(840_100);
  expect(got.interim).toEqual([]);
  expect(Object.keys(got.halvings ?? {})).toEqual(["210000", "420000", "630000", "840000"]);
  expect(saved.length).toBe(3);
});

test("inputs: a failed fetch merges nothing and leaves the others to land", async () => {
  const got: Partial<WorldInputs> = {};
  const failing: InputsIO = { ...io([]), price: async () => Promise.reject(new Error("down")) };
  expect(await fetchInputs(1, (p) => Object.assign(got, p), failing)).toBe(false);
  expect(got.currentPrice).toBe(undefined);
  expect(got.currentBlock).toBe(840_100);
  expect(await fetchInputs(1, () => undefined, io([]))).toBe(true);
  const noBlock: InputsIO = { ...io([]), height: async () => Promise.reject(new Error("down")) };
  expect(await fetchInputs(1, () => undefined, noBlock)).toBe(false);
});

/** Fake timers: `tick(ms)` fires every timer due by then, in order. */
const fakeTimers = (): Timers & { tick: (ms: number) => void } => {
  let t = 0;
  const due: { at: number; fn: () => void; id: number }[] = [];
  let next = 0;
  return {
    set: (fn, ms) => {
      next += 1;
      due.push({ at: t + ms, fn, id: next });
      return next;
    },
    clear: (id) => {
      const k = due.findIndex((d) => d.id === id);
      if (k >= 0) due.splice(k, 1);
    },
    tick: (ms) => {
      t += ms;
      for (const d of due.filter((x) => x.at <= t).toSorted((a, b) => a.at - b.at)) {
        due.splice(due.indexOf(d), 1);
        d.fn();
      }
    },
  };
};

const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const noLand = (): void => undefined;

test("n11: nothing for 400ms, then slow; a late price still lands ready", async () => {
  const timers = fakeTimers();
  const seen: InputsPhase[] = [];
  let land: (ok: boolean) => void = noLand;
  watchInputs(
    async () => new Promise<boolean>((r) => (land = r)),
    (ph) => seen.push(ph),
    timers,
  );
  timers.tick(LOADING_HOLD_MS - 1);
  expect(seen).toEqual([]);
  timers.tick(1);
  expect(seen).toEqual(["slow"]);
  timers.tick(INPUTS_TIMEOUT_MS);
  expect(seen).toEqual(["slow", "failed"]);
  land(true);
  await settle();
  expect(seen).toEqual(["slow", "failed", "ready"]);
  expect(LOADING_HOLD_MS).toBe(400);
  expect(INPUTS_RETRY_MS > INPUTS_TIMEOUT_MS).toBe(true);
});

test("n11: a fast success never shows the caption; a failure says failed; cancel silences", async () => {
  const timers = fakeTimers();
  const seen: InputsPhase[] = [];
  watchInputs(
    async () => true,
    (ph) => seen.push(ph),
    timers,
  );
  await settle();
  timers.tick(INPUTS_TIMEOUT_MS);
  expect(seen).toEqual(["ready"]);
  const failed: InputsPhase[] = [];
  watchInputs(
    async () => false,
    (ph) => failed.push(ph),
    timers,
  );
  await settle();
  expect(failed).toEqual(["failed"]);
  const quiet: InputsPhase[] = [];
  const cancel = watchInputs(
    async () => true,
    (ph) => quiet.push(ph),
    timers,
  );
  cancel();
  await settle();
  timers.tick(INPUTS_TIMEOUT_MS);
  expect(quiet).toEqual([]);
});

const html = (phase: InputsPhase): string =>
  renderToStaticMarkup(
    createElement(WorldLayer, { bands: null, now: 0, horizon: 1, label: "x", phase }),
  );

test("n11: the empty frame shows Form's captions; failed adds a quiet Try again button", () => {
  expect(html("waiting").includes('role="status"')).toBe(false);
  expect(html("slow").includes(">Loading prices\u2026<")).toBe(true);
  expect(html("slow").includes("<button")).toBe(false);
  const failed = html("failed");
  expect(
    failed.includes("Prices couldn\u2019t load. Check your connection; the chart will try again."),
  ).toBe(true);
  expect(failed.includes('type="button"')).toBe(true);
  expect(failed.includes(">Try again</button>")).toBe(true);
  expect(html("ready").includes('role="status"')).toBe(false);
});

/** A fake engine whose runs end only when the test says so. */
const fakeEngine = (): {
  engine: { set: (c: EngineConfig) => void; settled: () => Promise<"quiet"> };
  seen: EngineConfig[];
  finish: () => Promise<void>;
} => {
  const seen: EngineConfig[] = [];
  let release: (() => void)[] = [];
  return {
    seen,
    engine: {
      set: (config) => {
        seen.push(config);
      },
      settled: () =>
        new Promise((resolve) => {
          release.push(() => {
            resolve("quiet");
          });
        }),
    },
    finish: async () => {
      const now = release;
      release = [];
      for (const run of now) run();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
};

test("B1: one engine job at a time; commits during a run coalesce to the latest", async () => {
  const fake = fakeEngine();
  const { set, jobs } = coalesce(fake.engine);
  const inputs = { currentBlock: 1, currentPrice: 2, halvings: {}, interim: [], now: 0 };
  const configs = [1001, 1002, 1003, 1004, 1005].flatMap(
    (samples) => engineConfig({ ...defaultModelsValues(), samples }, inputs) ?? [],
  );
  for (const c of configs) set(c);
  expect(fake.seen).toEqual([configs[0]]);
  expect(jobs).toEqual({ requested: 5, started: 1, inFlight: 1, maxInFlight: 1 });
  await fake.finish();
  expect(fake.seen).toEqual([configs[0], configs[4]]);
  await fake.finish();
  expect(jobs).toEqual({ requested: 5, started: 2, inFlight: 0, maxInFlight: 1 });
  for (const c of configs.slice(0, 1)) set(c);
  expect(fake.seen.length).toBe(3);
});

const at = (
  pane: string | null,
): { closest: () => { getAttribute: () => string | null } | null } => ({
  closest: () => (pane === null ? null : { getAttribute: () => pane }),
});

test("1L.2: the pane last clicked, tapped or tabbed into is the active pane", () => {
  expect(paneOf(at("stats"), "models")).toBe("stats");
  expect(paneOf(at("plans"), "stats")).toBe("plans");
  // Outside every pane (the chart, the header) the active pane stays as it was.
  expect(paneOf(at(null), "plans")).toBe("plans");
  expect(paneOf(null, "models")).toBe("models");
  expect(paneOf(at("bogus"), "models")).toBe("models");
});

// §1L.5: the sheet follows the finger.
const STOPS = [
  ["closed", 70],
  ["half", 194],
  ["full", 388],
] as const;

test("1L.5: inside the stops the edge tracks the pointer 1:1; past them it moves a third", () => {
  expect(rubberBand(200, 70, 388)).toBe(200);
  expect(rubberBand(388, 70, 388)).toBe(388);
  expect(rubberBand(448, 70, 388)).toBe(408);
  expect(rubberBand(40, 70, 388)).toBe(60);
  expect(RUBBER).toBe(1 / 3);
});

test("1L.5: under 6px of movement is a tap", () => {
  expect([isTap(0, 0), isTap(3, 4), isTap(5.9, 0), isTap(6, 0), isTap(0, -7)]).toEqual([
    true,
    true,
    true,
    false,
    false,
  ]);
});

test("1L.5: release velocity comes from the last 100ms of samples (px/ms, + = growing)", () => {
  const s = [
    { t: 0, size: 100 },
    { t: 50, size: 120 },
    { t: 150, size: 160 },
    { t: 200, size: 200 },
  ];
  expect(velocity(s, 200)).toBe(0.8); // 120 → 200 over 100ms
  expect(velocity(s, 400)).toBe(0); // held still before release
  expect(velocity([{ t: 0, size: 100 }], 0)).toBe(0);
  expect(velocity([], 10)).toBe(0);
});

test("1L.5: release snaps to the nearest stop; a flick ≥0.5px/ms snaps in its direction", () => {
  expect(snapStop(150, 0, STOPS)).toBe("half");
  expect(snapStop(120, 0.2, STOPS)).toBe("closed");
  expect(snapStop(300, -0.49, STOPS)).toBe("full");
  // Flicks: from just above half upward goes full; from just below half downward goes closed.
  expect(snapStop(200, FLICK, STOPS)).toBe("full");
  expect(snapStop(190, -FLICK, STOPS)).toBe("closed");
  expect(snapStop(120, 0.9, STOPS)).toBe("half");
  expect(snapStop(300, -2, STOPS)).toBe("half");
  // Past the ends a flick outward stays at the end.
  expect(snapStop(400, 1, STOPS)).toBe("full");
  expect(snapStop(60, -1, STOPS)).toBe("closed");
  // The landscape panel has two stops.
  expect(
    snapStop(200, 0, [
      ["closed", 64],
      ["full", 460],
    ]),
  ).toBe("closed");
  expect(
    snapStop(200, 0.6, [
      ["closed", 64],
      ["full", 460],
    ]),
  ).toBe("full");
});

test("1L.5: tap and keys toggle closed ↔ half (the existing cap); each position is announced", () => {
  expect([toggleStop("closed"), toggleStop("half"), toggleStop("full")]).toEqual([
    "half",
    "closed",
    "closed",
  ]);
  expect([strings.dock.sheet.closed, strings.dock.sheet.half, strings.dock.sheet.full]).toEqual([
    "Sheet closed",
    "Sheet half open",
    "Sheet full",
  ]);
});

test("1L.5: a gesture under 6px is a tap; past it the sheet follows the pointer 1:1", () => {
  const g = gesture(
    { x: 100, y: 500, t: 0, size: 70, at: "closed" },
    false,
    stopsFor(false, 70, 194, 388),
  );
  expect(g.move(102, 497, 10)).toBe(null);
  expect(g.dragging()).toBe(false);
  expect(g.move(100, 400, 400)).toBe(170); // 100px up: 100px taller, no lag
  expect(g.move(100, 300, 800)).toBe(270);
  expect(g.dragging()).toBe(true);
  expect(g.release(1000, false)).toBe("half"); // held still: nearest (270 is 76 from half, 118 from full)
});

test("1L.5: release: slow lands on the nearest stop, a flick in its direction, cancel stays", () => {
  // Item 5 (Form): half is the existing cap (46vh / 40vh), full is up to the header.
  const stops = stopsFor(false, 70, 194, 388);
  expect(stopsFor(true, 64, 460, 999)).toEqual([
    ["closed", 64],
    ["full", 460],
  ]);
  expect(stops).toEqual([
    ["closed", 70],
    ["half", 194],
    ["full", 388],
  ]);
  const slow = gesture({ x: 0, y: 500, t: 0, size: 70, at: "closed" }, false, stops);
  slow.move(0, 380, 500);
  expect(slow.release(900, false)).toBe("half");
  const flick = gesture({ x: 0, y: 500, t: 0, size: 70, at: "closed" }, false, stops);
  flick.move(0, 480, 10);
  flick.move(0, 440, 60); // 40px in 50ms = 0.8 px/ms upward, still below half
  expect(flick.release(70, false)).toBe("half");
  const cancel = gesture({ x: 0, y: 500, t: 0, size: 194, at: "half" }, false, stops);
  cancel.move(0, 300, 100);
  expect(cancel.release(120, true)).toBe("half");
  const tap = gesture({ x: 0, y: 500, t: 0, size: 194, at: "half" }, false, stops);
  expect(tap.release(50, false)).toBe(null);
  // Past full it rubber-bands a third.
  const over = gesture({ x: 0, y: 500, t: 0, size: 388, at: "full" }, false, stops);
  expect(over.move(0, 470, 50)).toBe(398);
  // The landscape panel: leftward grows it, two stops.
  const panel = gesture(
    { x: 780, y: 100, t: 0, size: 64, at: "closed" },
    true,
    stopsFor(true, 64, 460, 460),
  );
  expect(panel.move(680, 100, 300)).toBe(164);
  expect(panel.release(700, false)).toBe("closed");
});

const ptr = (type: string, x: number, y: number, t: number, id = 1): Event => {
  const e = Object.assign(new Event(type, { cancelable: true }), {
    pointerId: id,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(e, "timeStamp", { value: t });
  return e;
};

/** A document stand-in. */
const fakeDoc = (): EventTarget & { at: (e: Event) => void } => {
  const doc = new EventTarget();
  return Object.assign(doc, {
    at: (e: Event): void => {
      doc.dispatchEvent(e);
    },
  });
};

test("1L.5 wiring: a slow drag tracks every move 1:1, then rests on the nearest stop", () => {
  const doc = fakeDoc();
  const log: string[] = [];
  const grab = {
    at: "closed",
    horizontal: false,
    size: 70,
    closed: 70,
    cap: 194,
    full: 388,
    ownsTap: true,
  } as const;
  const detach = attachDrag(doc, {
    grab: () => grab,
    begin: (s) => log.push(`begin ${String(s)}`),
    track: (s) => log.push(`track ${String(s)}`),
    rest: (n, d) => log.push(`rest ${n} ${String(d)}`),
    tap: () => log.push("tap"),
  });
  doc.at(ptr("pointerdown", 100, 700, 0));
  doc.at(ptr("pointermove", 100, 698, 10)); // under 6px: nothing yet
  doc.at(ptr("pointermove", 100, 650, 300));
  doc.at(ptr("pointermove", 100, 600, 600));
  doc.at(ptr("pointermove", 100, 600, 700, 2)); // another pointer: ignored
  doc.at(ptr("pointerup", 100, 600, 900));
  expect(log).toEqual(["begin 70", "track 120", "track 170", "rest half true"]);
  // The click that ends a drag is swallowed; the next one is not.
  const click = new Event("click", { cancelable: true });
  doc.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  const again = new Event("click", { cancelable: true });
  doc.dispatchEvent(again);
  expect(again.defaultPrevented).toBe(false);
  detach();
  doc.at(ptr("pointerdown", 100, 700, 1000));
  doc.at(ptr("pointermove", 100, 500, 1100));
  expect(log.length).toBe(4);
});

test("1L.5 wiring: a tap off a button toggles; on a button its click does; off-strip is ignored", () => {
  const doc = fakeDoc();
  const rests: string[] = [];
  let owns = false;
  let on = true;
  attachDrag(doc, {
    grab: () =>
      on
        ? {
            at: "full",
            horizontal: true,
            size: 460,
            closed: 64,
            cap: 460,
            full: 460,
            ownsTap: owns,
          }
        : null,
    begin: () => undefined,
    track: () => undefined,
    rest: (n, d) => rests.push(`${n} ${String(d)}`),
    tap: () => rests.push("tap"),
  });
  doc.at(ptr("pointerdown", 500, 100, 0));
  doc.at(ptr("pointerup", 503, 100, 80));
  owns = true;
  doc.at(ptr("pointerdown", 500, 100, 200));
  doc.at(ptr("pointerup", 500, 100, 260));
  // A cancelled drag rests where it started.
  doc.at(ptr("pointerdown", 500, 100, 300));
  doc.at(ptr("pointermove", 700, 100, 350));
  doc.at(ptr("pointercancel", 700, 100, 360));
  on = false;
  doc.at(ptr("pointerdown", 500, 100, 400));
  doc.at(ptr("pointerup", 500, 100, 420));
  expect(rests).toEqual(["tap", "full true"]);
});

const boxed = (bottom: number): Parameters<typeof fullOf>[0]["root"] => ({
  current: { getBoundingClientRect: () => ({ bottom }) },
});

test("item 5: the full stop runs from the header's lower edge to the shell's bottom", () => {
  expect(fullOf({ root: boxed(844), header: boxed(46) })).toBe(798);
  expect(fullOf({ root: boxed(40), header: boxed(46) })).toBe(0);
  expect(fullOf({ root: { current: null }, header: boxed(46) })).toBe(0);
});

test("item 5: buttons, tabs and links take their own taps; the bare strip toggles", () => {
  expect(ownsTap({ closest: () => ({}) })).toBe(true);
  expect(ownsTap({ closest: () => null })).toBe(false);
});

test("Probe m11: the landscape panel has one open stop, however it was opened", () => {
  // Tap, Enter or the tab open the panel to the same stop a drag snaps to ("full", "Sheet full").
  expect([toggleStop("closed", true), toggleStop("full", true)]).toEqual(["full", "closed"]);
  expect(stopsFor(true, 0, 300, 900).map(([s]) => s)).toEqual(["closed", "full"]);
  expect(toggleStop("closed", false)).toBe("half");
});

const withRects = (rects: number): { getClientRects: () => { length: number } } => ({
  getClientRects: () => ({ length: rects }),
});

test("Probe m9: Esc returns focus to the tab when it's rendered, else to the grab button", () => {
  const el = withRects;
  const tab = el(1);
  const grab = el(1);
  expect(returnFocus(tab, grab)).toBe(tab);
  // Phone portrait, sheet closed: the dock row is display:none, so the tab has no boxes.
  const hidden = el(0);
  expect(returnFocus(hidden, grab)).toBe(grab);
  expect(returnFocus(null, grab)).toBe(grab);
});

/** §1R: a run of taps from `at`, carrying the direction from move to move. */
const taps = (from: Stop, dir: Dir, n: number, side = false): Stop[] => {
  const seen: Stop[] = [];
  let s = from;
  let d = dir;
  for (let i = 0; i < n; i += 1) {
    const next = tapStop(s, d, side);
    d = dirOf(s, next, d);
    s = next;
    seen.push(s);
  }
  return seen;
};

test("1R: five taps from closed visit half, full, half, closed, half", () => {
  expect(taps("closed", "down", 5)).toEqual(["half", "full", "half", "closed", "half"]);
  expect(taps("closed", "up", 5)).toEqual(["half", "full", "half", "closed", "half"]);
});

test("1R: a drag sets the direction from its net movement; the next tap carries on", () => {
  // Dragged up from closed to half: the tap goes on up, to full.
  expect(taps("half", dirOf("closed", "half", "down"), 1)).toEqual(["full"]);
  // Dragged up to full: a tap comes back to half, a second to closed.
  expect(taps("full", dirOf("half", "full", "down"), 2)).toEqual(["half", "closed"]);
  // Dragged down from full to half: the tap carries on down.
  expect(taps("half", dirOf("full", "half", "up"), 1)).toEqual(["closed"]);
  // A drag that rests where it started keeps the direction.
  expect(dirOf("half", "half", "up")).toBe("up");
});

test("1R: the landscape panel just toggles", () => {
  expect(taps("closed", "up", 4, true)).toEqual(["full", "closed", "full", "closed"]);
});

const ALL: readonly Stop[] = ["closed", "half", "full"];

test("1P: grab-button keys: ↑/↓ one stop, Home full, End closed; others pass through", () => {
  expect(ALL.map((s) => keyStop(s, "ArrowUp"))).toEqual(["half", "full", "full"]);
  expect(ALL.map((s) => keyStop(s, "ArrowDown"))).toEqual(["closed", "closed", "half"]);
  expect([keyStop("half", "Home"), keyStop("half", "End"), keyStop("half", "a")]).toEqual([
    "full",
    "closed",
    null,
  ]);
  expect([keyStop("closed", "ArrowUp", true), keyStop("full", "ArrowDown", true)]).toEqual([
    "full",
    "closed",
  ]);
});

test("1S: desktop heads the three columns; phones and the open panel group; the shut panel rails", () => {
  expect(dockLayout(false, true, true)).toBe("columns");
  expect(dockLayout(false, false, true)).toBe("columns");
  expect(dockLayout(false, false, false)).toBe("row");
  expect(dockLayout(true, false, true)).toBe("row");
  expect(dockLayout(true, true, true)).toBe("rail");
});
