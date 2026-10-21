/** V32-BUILD §1g (Probe M3 / FL-001): the pure entry rules every NumberField commits through. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";
import { strings } from "../../src/v2/app/strings";

import { NumberField } from "../../src/v2/design/primitives/NumberField";
import {
  normalizeNumberText,
  showNumber,
  onBound,
  parseNumber,
  resolveEntry,
  stepValue,
} from "../../src/v2/design/primitives/NumberField/entry";
import {
  createSettle,
  type Timers,
  WHEEL_SETTLE_MS,
} from "../../src/v2/design/primitives/NumberField/settle";
import {
  createThrottle,
  HELD_COMMIT_MS,
} from "../../src/v2/design/primitives/NumberField/throttle";
import { coalesce } from "../../src/v2/app/engine/coalesce";
import { engineConfig } from "../../src/v2/app/engine/config";
import type { EngineConfig } from "../../src/engine/keys";
import { defaultModelsValues } from "../../src/v2/app/models/values";

const VOL = { min: 0, max: 1 };
const FLOOR = { min: 1.01, max: Number.POSITIVE_INFINITY };

test("a value outside the accepted range commits the nearest bound and says so", () => {
  expect(resolveEntry("4", "float", VOL, null)).toEqual({ kind: "clamped", value: 1, typed: 4 });
  expect(resolveEntry("-2", "float", VOL, null)).toEqual({ kind: "clamped", value: 0, typed: -2 });
});

test("an Infinity bound never clamps; only the finite side does", () => {
  expect(resolveEntry("1e6", "float", FLOOR, null)).toEqual({ kind: "ok", value: 1_000_000 });
  expect(resolveEntry("0.5", "float", FLOOR, null)).toEqual({
    kind: "clamped",
    value: 1.01,
    typed: 0.5,
  });
});

test("unparseable text is invalid and commits nothing (never NaN)", () => {
  for (const text of ["abc", "1e", "12abc", "--1", "Infinity", "1.5"]) {
    expect(resolveEntry(text, text === "1.5" ? "int" : "float", VOL, null)).toEqual({
      kind: "invalid",
    });
  }
});

test("empty commits the field's emptyValue, or is invalid without one", () => {
  expect(resolveEntry("", "int", { min: 0, max: 10_000 }, 1000)).toEqual({
    kind: "ok",
    value: 1000,
  });
  expect(resolveEntry("  ", "float", VOL, null)).toEqual({ kind: "invalid" });
});

test("Postel text: separators and U+2212 normalise before the strict parse", () => {
  expect(normalizeNumberText("1,000 000\u00A0\u202F\u2009")).toBe("1000000");
  expect(parseNumber("\u22120.4", "float")).toBe(-0.4);
  expect(parseNumber("2 000", "int")).toBe(2000);
});

test("a step moves by step (×10 for PgUp/PgDn), clamps, and keeps the step's decimals", () => {
  expect(stepValue(0.1, 1, 0.005, VOL)).toBe(0.105);
  expect(stepValue(0.995, 1, 0.005, VOL, true)).toBe(1);
  expect(stepValue(10, -1, 1, { min: 1, max: 100 }, true)).toBe(1);
});

test("the message slot is always mounted as a polite live region and is undescribed until used", () => {
  const html = renderToStaticMarkup(
    createElement(NumberField, { id: "f", label: "Volatility (0-1):", value: 0.1, bounds: VOL }),
  );
  expect(html.includes('id="f-message" aria-live="polite"')).toBe(true);
  expect(html.includes("aria-describedby")).toBe(false);
  expect(html.includes('aria-valuemin="0" aria-valuemax="1"')).toBe(true);
});

/** A manual clock: timers fire only when the test advances time. */
const clock = (): { timers: Timers; advance: (ms: number) => void; live: () => number } => {
  let now = 0;
  let next = 1;
  const due = new Map<number, { at: number; run: () => void }>();
  return {
    timers: {
      set: (run, ms) => {
        due.set(next, { at: now + ms, run });
        return next++;
      },
      clear: (id) => {
        due.delete(id);
      },
    },
    advance: (ms) => {
      now += ms;
      for (const [id, t] of due) {
        if (t.at > now) continue;
        due.delete(id);
        t.run();
      }
    },
    live: () => due.size,
  };
};

test("B1: 300 wheel notches 30 ms apart commit exactly once, WHEEL_SETTLE_MS after the last", () => {
  const { timers, advance, live } = clock();
  let commits = 0;
  const settle = createSettle(
    () => {
      commits += 1;
    },
    WHEEL_SETTLE_MS,
    timers,
  );
  for (let i = 0; i < 300; i += 1) {
    settle.poke();
    advance(30);
  }
  expect({ commits, pending: settle.pending(), timers: live() }).toEqual({
    commits: 0,
    pending: true,
    timers: 1,
  });
  advance(WHEEL_SETTLE_MS - 31);
  expect(commits).toBe(0);
  advance(1);
  expect(commits).toBe(1);
  advance(10_000);
  expect({ commits, pending: settle.pending() }).toEqual({ commits: 1, pending: false });
});

test("B1: blur / Enter flush a pending wheel commit at once; cancel and idle flush do nothing", () => {
  const { timers, advance } = clock();
  let commits = 0;
  const settle = createSettle(
    () => {
      commits += 1;
    },
    WHEEL_SETTLE_MS,
    timers,
  );
  expect(settle.flush()).toBe(false);
  settle.poke();
  expect(settle.flush()).toBe(true);
  advance(WHEEL_SETTLE_MS * 2);
  expect(commits).toBe(1);
  settle.poke();
  settle.cancel();
  advance(WHEEL_SETTLE_MS * 2);
  expect({ commits, flushed: settle.flush() }).toEqual({ commits: 1, flushed: false });
});

test("m6: a step that stops on a finite bound is a clamp; Infinity bounds never are", () => {
  const epochs = { min: 1, max: 30 };
  expect(onBound(stepValue(29, 1, 1, epochs), epochs)).toBe(true);
  expect(onBound(stepValue(30, 1, 1, epochs, true), epochs)).toBe(true);
  expect(onBound(stepValue(2, -1, 1, epochs), epochs)).toBe(true);
  expect(onBound(stepValue(10, 1, 1, epochs), epochs)).toBe(false);
  expect(onBound(5, FLOOR)).toBe(false);
  expect(onBound(1.01, FLOOR)).toBe(true);
});

/** A held key: a step every `repeat` ms for `holdMs`, reading a draft that climbs by one per step. */
const hold = (
  repeat: number,
  holdMs: number,
): {
  commits: { at: number; value: number }[];
  maxLive: number;
  releaseCommits: number;
  after: number;
  last: number;
} => {
  const { timers, advance, live } = clock();
  let now = 0;
  let draft = 0;
  const commits: { at: number; value: number }[] = [];
  const throttle = createThrottle(
    () => {
      commits.push({ at: now, value: draft });
    },
    HELD_COMMIT_MS,
    timers,
  );
  let maxLive = 0;
  while (now < holdMs) {
    draft += 1;
    throttle.poke();
    maxLive = Math.max(maxLive, live());
    now += repeat;
    advance(repeat);
  }
  const before = commits.length;
  throttle.release();
  const releaseCommits = commits.length - before;
  advance(10_000);
  return { commits, maxLive, releaseCommits, after: commits.length - before, last: draft };
};

test("held step: commits at once, then at most every HELD_COMMIT_MS, latest draft only", () => {
  const { commits, maxLive } = hold(30, 10_000);
  expect(commits[0]).toEqual({ at: 0, value: 1 });
  for (let i = 1; i < commits.length - 1; i += 1) {
    const gap = (commits[i]?.at ?? 0) - (commits[i - 1]?.at ?? 0);
    expect(gap).toBeGreaterThanOrEqual(HELD_COMMIT_MS);
    expect(gap).toBeLessThanOrEqual(HELD_COMMIT_MS + 29);
  }
  // 10 s of 30 ms repeats is 334 steps; ~1 commit per 120 ms tick, never one per step.
  expect(commits.length).toBeGreaterThanOrEqual(71);
  expect(commits.length).toBeLessThanOrEqual(10_000 / HELD_COMMIT_MS + 2);
  // Steps between ticks are dropped, not queued: values only rise, and skip.
  const values = commits.map((c) => c.value);
  expect(values.every((v, i) => i === 0 || v > (values[i - 1] ?? 0))).toBe(true);
  expect(maxLive).toBe(1);
});

test("held step: release commits exactly once with the final draft; nothing after", () => {
  const { commits, releaseCommits, after, last } = hold(30, 10_000);
  expect({ releaseCommits, after }).toEqual({ releaseCommits: 1, after: 1 });
  expect(commits.at(-1)?.value).toBe(last);
});

test("held step: a single tap commits once on press and once on release (deduped by value)", () => {
  const { commits, releaseCommits } = hold(30, 1);
  expect(commits.map((c) => c.value)).toEqual([1, 1]);
  expect(releaseCommits).toBe(1);
});

test("wheel flood: throttled live commits, one trailing commit on settle, timers bounded", () => {
  const { timers, advance, live } = clock();
  let now = 0;
  let draft = 0;
  const values: number[] = [];
  const throttle = createThrottle(
    () => {
      values.push(draft);
    },
    HELD_COMMIT_MS,
    timers,
  );
  const settle = createSettle(throttle.release, WHEEL_SETTLE_MS, timers);
  let maxLive = 0;
  for (let i = 0; i < 2000; i += 1, now += 5) {
    draft += 1;
    throttle.poke();
    settle.poke();
    maxLive = Math.max(maxLive, live());
    advance(5);
  }
  const during = values.length;
  expect(during).toBeLessThanOrEqual((2000 * 5) / HELD_COMMIT_MS + 2);
  expect(maxLive).toBeLessThanOrEqual(2);
  for (let t = 0; t < 1000; t += 5) advance(5);
  expect(values.length).toBe(during + 1);
  expect(values.at(-1)).toBe(2000);
  expect({ live: live(), pending: settle.pending(), ticking: throttle.live() }).toEqual({
    live: 0,
    pending: false,
    ticking: false,
  });
});

test("held step: Escape / unmount cancel commits nothing more", () => {
  const { timers, advance, live } = clock();
  let commits = 0;
  const throttle = createThrottle(
    () => {
      commits += 1;
    },
    HELD_COMMIT_MS,
    timers,
  );
  throttle.poke();
  throttle.poke();
  throttle.cancel();
  advance(HELD_COMMIT_MS * 5);
  expect({ commits, live: live() }).toEqual({ commits: 1, live: 0 });
});

test("held step at a bound: every live commit is finite, in range, and stops on the bound", () => {
  const { timers, advance } = clock();
  const bounds = { min: 1, max: 1_000 };
  let draft = "990";
  const committed: number[] = [];
  const clamped: boolean[] = [];
  const throttle = createThrottle(
    () => {
      const result = resolveEntry(draft, "int", bounds, null);
      if (result.kind === "invalid") throw new Error("invalid");
      committed.push(result.value);
      clamped.push(onBound(result.value, bounds));
    },
    HELD_COMMIT_MS,
    timers,
  );
  for (let i = 0; i < 100; i += 1) {
    draft = String(stepValue(Number(draft), 1, 1, bounds, i % 2 === 0));
    throttle.poke();
    advance(30);
  }
  throttle.release();
  expect(committed.every((v) => Number.isFinite(v) && v >= 1 && v <= 1_000)).toBe(true);
  expect({ last: committed.at(-1), clamped: clamped.at(-1) }).toEqual({
    last: 1_000,
    clamped: true,
  });
});

test("held step through the coalesced engine: one job in flight, superseded configs dropped", async () => {
  const { timers, advance } = clock();
  const seen: number[] = [];
  let release: (() => void)[] = [];
  const engine = {
    set: (config: EngineConfig) => {
      seen.push(config.samples);
    },
    settled: () =>
      new Promise<"quiet">((resolve) => {
        release.push(() => {
          resolve("quiet");
        });
      }),
  };
  const { set, jobs } = coalesce(engine);
  const inputs = { currentBlock: 1, currentPrice: 2, halvings: {}, interim: [], now: 0 };
  let draft = 0;
  const throttle = createThrottle(
    () => {
      const config = engineConfig({ ...defaultModelsValues(), samples: draft }, inputs);
      if (config !== null) set(config);
    },
    HELD_COMMIT_MS,
    timers,
  );
  // 10 s held at 30 ms repeats; each engine run takes 350 ms.
  for (let t = 0; t < 10_000; t += 30) {
    draft += 1;
    throttle.poke();
    advance(30);
    if (t % 350 < 30) {
      const done = release;
      release = [];
      for (const run of done) run();
      await Promise.resolve();
    }
    expect(jobs.inFlight).toBeLessThanOrEqual(1);
  }
  throttle.release();
  for (let i = 0; i < 4; i += 1) {
    const done = release;
    release = [];
    for (const run of done) run();
    await Promise.resolve();
  }
  expect(jobs.maxInFlight).toBe(1);
  // ~1 config per tick requested, but only ~1 per run started; the final value always runs.
  expect(jobs.started * 2).toBeLessThanOrEqual(jobs.requested - 1);
  expect(seen.at(-1)).toBe(draft);
});

test("showNumber groups thousands on the integer part only; the parse reads it back", () => {
  expect([1000, 10_000, 1_234_567.25, -2500, 40, 0.125, Number.NaN].map(showNumber)).toEqual([
    "1,000",
    "10,000",
    "1,234,567.25",
    "-2,500",
    "40",
    "0.125",
    "",
  ]);
  expect(parseNumber(showNumber(1_234_567.25), "float")).toBe(1_234_567.25);
});

test("Probe 1MP M2: a slider drag commits live (≤100 ms behind the thumb) and once on release", async () => {
  const { createLive } = await import("../../src/v2/design/primitives/Slider/live");
  const c = clock();
  const sent: number[] = [];
  let value = 0.1;
  const live = createLive(
    (n) => sent.push((value = n)),
    () => value,
    c.timers,
  );
  // A drag from 0.1 to 0.9: one move every 16 ms (a frame), 50 frames.
  for (let i = 1; i <= 50; i += 1) {
    live.move(Math.round((0.1 + i * 0.016) * 1000) / 1000);
    c.advance(16);
  }
  // Live, not frozen: the first move at once, then about every 100 ms (800 ms / 100 = 8 more).
  expect(sent[0]).toBe(0.116);
  expect(sent.length).toBeGreaterThanOrEqual(8);
  expect(sent.length).toBeLessThanOrEqual(10);
  live.release(0.9);
  expect(sent.at(-1)).toBe(0.9);
  const n = sent.length;
  live.release(0.9); // a repeat of the applied value sends nothing
  c.advance(500);
  expect(sent.length).toBe(n);
  live.move(0.5);
  live.cancel();
  c.advance(500);
  expect(sent.at(-1)).toBe(0.5); // the first move of a hold lands at once; cancel drops the rest
});

test("Probe 1MP m4: tiny and huge values never show exponent notation, and read back exactly", () => {
  const cases: [number, string][] = [
    [1e-7, "0.0000001"],
    [1.23456789e-7, "0.000000123456789"],
    [1e300, "1×10³⁰⁰"],
    [-2.5e-24, "-2.5×10⁻²⁴"],
    [1.2345e25, "1.2345×10²⁵"],
  ];
  for (const [n, shown] of cases) {
    expect(showNumber(n)).toBe(shown);
    expect(parseNumber(shown, "float")).toBe(n);
    expect(/e/i.test(shown)).toBe(false);
  }
});

test("Probe R2 m3: the spoken value is the shown one, the ×10 form in words", async () => {
  const { speakNumber } = await import("../../src/v2/design/primitives/NumberField/entry");
  expect(speakNumber(1e300)).toBe("1 times ten to the 300");
  expect(speakNumber(-2.5e-24)).toBe("minus 2.5 times ten to the minus 24");
  expect(speakNumber(1e9)).toBe("1,000,000,000");
  expect(speakNumber(1e-7)).toBe("0.0000001");
  expect(speakNumber(123.456789)).toBe("123.456789");
  expect(speakNumber(-3)).toBe("minus 3");
  expect(strings.fields.focus["R (%)"]?.spoken(1e300)).toBe("1 times ten to the 300 percent");
});
