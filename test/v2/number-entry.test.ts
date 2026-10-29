/** V32-BUILD §1g (Probe M3 / FL-001): the pure entry rules every NumberField commits through. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";
import { strings } from "../../src/v2/app/strings";

import { NumberField } from "../../src/v2/design/primitives/NumberField";
import {
  normalizeNumberText,
  editNumber,
  showNumber,
  onBound,
  parseNumber,
  resolveEntry,
  stepValue,
} from "../../src/v2/design/primitives/NumberField/entry";
import { createSettle, WHEEL_SETTLE_MS } from "../../src/v2/design/primitives/NumberField/settle";
import {
  createThrottle,
  HELD_COMMIT_MS,
} from "../../src/v2/design/primitives/NumberField/throttle";
import { coalesce } from "../../src/v2/app/engine/coalesce";
import { engineConfig } from "../../src/v2/app/engine/config";
import type { EngineConfig } from "../../src/engine/keys";
import { defaultModelsValues } from "../../src/v2/app/models/values";
import { clock } from "./support/clock";

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
  for (const text of ["abc", "1e", "12abc", "--1", "Infinity"]) {
    expect(resolveEntry(text, "float", VOL, null)).toEqual({ kind: "invalid" });
  }
  // Form 2g: a fraction in a whole-number field is invalid with its own short note.
  expect(resolveEntry("1.5", "int", VOL, null)).toEqual({ kind: "invalid", reason: "whole" });
});

test("empty commits the field's emptyValue, or is invalid without one", () => {
  expect(resolveEntry("", "int", { min: 0, max: 10_000 }, 1000)).toEqual({
    kind: "ok",
    value: 1000,
  });
  expect(resolveEntry("  ", "float", VOL, null)).toEqual({ kind: "invalid", reason: "empty" });
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

test("Form rulings 4 / 4a: grouped digits to 999,999,999, then ×10 at 3 significant figures; a focused field's full form reads back exactly", () => {
  const X = "\u00A0×\u00A010";
  const cases: [number, string, string][] = [
    [999_999_999, "999,999,999", "999,999,999"],
    [1e9, `1${X}⁹`, `1${X}⁹`],
    [1.2e12, `1.2${X}¹²`, `1.2${X}¹²`],
    [1_234_567_890, `1.23${X}⁹`, `1.23456789${X}⁹`],
    [1.2e12 + 1e9, `1.2${X}¹²`, `1.201${X}¹²`], // 3 figures, trailing zeros dropped
    [9.996e9, `1${X}¹⁰`, `9.996${X}⁹`], // rounding carries into the exponent
    [-1.2e12, `-1.2${X}¹²`, `-1.2${X}¹²`],
    [1e-7, "0.0000001", "0.0000001"],
    [1.23456789e-7, "0.000000123456789", "0.000000123456789"],
    [1e300, `1${X}³⁰⁰`, `1${X}³⁰⁰`],
    [-2.54321e-24, `-2.54${X}⁻²⁴`, `-2.54321${X}⁻²⁴`],
  ];
  for (const [n, shown, full] of cases) {
    expect([showNumber(n), editNumber(n)]).toEqual([shown, full]);
    expect(parseNumber(full, "float")).toBe(n);
    expect(/e/i.test(shown + full)).toBe(false);
  }
  expect(parseNumber(`1.23${X}⁹`, "float")).toBe(1.23e9); // the shown form reads back as shown
  expect(parseNumber("1.2 × 10¹²", "float")).toBe(1.2e12); // typed with plain spaces too
  const html = renderToStaticMarkup(
    createElement(NumberField, {
      id: "f",
      label: "x",
      value: 1_234_567_890,
      bounds: { min: 0, max: Infinity },
    }),
  );
  // At rest the field shows (and speaks) 3 figures; focus swaps in editNumber's full form.
  expect(
    html.includes(`value="1.23${X}⁹"`) && html.includes('aria-valuetext="1.23 times 10 to the 9"'),
  ).toBe(true);
});

test("Probe R2 m3 / ruling 4: the spoken value is the shown one, the ×10 form in words", async () => {
  const { speakNumber } = await import("../../src/v2/design/primitives/NumberField/entry");
  expect(speakNumber(1.2e12)).toBe("1.2 times 10 to the 12");
  expect(speakNumber(1e300)).toBe("1 times 10 to the 300");
  expect(speakNumber(1_234_567_890)).toBe("1.23 times 10 to the 9"); // 4a: as shown, 3 figures
  expect(speakNumber(-2.5e-24)).toBe("minus 2.5 times 10 to the minus 24");
  expect(speakNumber(999_999_999)).toBe("999,999,999");
  expect(speakNumber(1e-7)).toBe("0.0000001");
  expect(speakNumber(123.456789)).toBe("123.456789");
  expect(speakNumber(-3)).toBe("minus 3");
  // The clamp note uses the shown form: never a long digit string.
  const big = strings.fields.limit(true, 1e300);
  expect(big.includes(`1\u00A0×\u00A010³⁰⁰`) && !big.includes("000,000")).toBe(true);
});

test("Form 2a / 4c: R and +/- rest at 2 decimals (×10 at 3 figures); a focused field keeps what was typed", async () => {
  const { keptText, shownAt, speakNumber } =
    await import("../../src/v2/design/primitives/NumberField/entry");
  const HALVINGS = { min: 2, max: 3 };
  expect(resolveEntry("2.5", "float", HALVINGS, null)).toEqual({ kind: "ok", value: 2.5 }); // R
  // 2a: at rest, 2 decimals for an ordinary value (trailing zeros dropped), 3 figures in ×10 form.
  const X = "\u00A0×\u00A010";
  const rest = shownAt(2);
  expect([123.456789, 50, 3.1, 1.005, 0.001, -0.004, 999_999.999].map(rest)).toEqual([
    "123.46",
    "50",
    "3.1",
    "1",
    "0",
    "0",
    "1,000,000",
  ]);
  expect(rest(1_234_567_890_123)).toBe(`1.23${X}¹²`);
  expect(shownAt()(123.456789)).toBe("123.456789"); // other fields are unchanged
  expect(speakNumber(123.456789, 2)).toBe("123.46"); // spoken as shown
  // 4c: after Enter the focused field keeps the typed digits when they are the value used;
  // otherwise (clamped, emptied) it shows the value used.
  expect(keptText("1234567890123", "float", 1_234_567_890_123)).toBe("1234567890123");
  expect(keptText("123.456789", "float", 123.456789)).toBe("123.456789");
  expect(keptText("2.5", "float", 3)).toBe("3");
  // 4d: and in raw digits, never grouped ("1000", not "1,000" or "5000").
  expect(keptText("5000", "float", 1000)).toBe("1000");
  // SSR at rest: R shows (and speaks) 123.46; the full value stays in aria-valuenow.
  const html = renderToStaticMarkup(
    createElement(NumberField, { id: "r", label: "R (%)", value: 123.456789, places: 2 }),
  );
  expect(html.includes('value="123.46"')).toBe(true);
  expect(html.includes('aria-valuetext="123.46"')).toBe(true);
  expect(html.includes('aria-valuenow="123.456789"')).toBe(true);
});

test("Form 4d/4e: a clamp on Enter or on blur shows the short note, kept until the next edit", async () => {
  const { keptText, rawNumber } = await import("../../src/v2/design/primitives/NumberField/entry");
  const { afterEdit, messageOf, statusOf } =
    await import("../../src/v2/design/primitives/NumberField/status");
  const R = { min: 0, max: 1000 };
  // Typing 5000 in R commits 1000 and the focused field shows "1000": not "1,000", not "5000".
  const result = resolveEntry("5000", "float", R, null);
  expect(result).toEqual({ kind: "clamped", value: 1000, typed: 5000 });
  expect(keptText("5000", "float", 1000)).toBe("1000");
  expect(keptText("12,345.5", "float", 12_345.5)).toBe("12,345.5"); // 4c: exact typed text kept
  expect(keptText("99999", "int", 10_000)).toBe("10000");
  expect([rawNumber(1_234_567.5), rawNumber(-12_000), rawNumber(0.001)]).toEqual([
    "1234567.5",
    "-12000",
    "0.001",
  ]);
  const copy = {
    invalidMessage: () => "long",
    limitNote: (used: number, b: { min: number; max: number }) =>
      strings.fields.limit(used === b.max, used),
  };
  // 4e: Enter and blur commit alike; there is no focus argument and no long clamp message.
  const noted = statusOf(result, false);
  expect(messageOf(noted, 1000, R, copy)).toBe("Max is 1,000");
  expect(messageOf(statusOf(resolveEntry("-3", "float", R, null), false), 0, R, copy)).toBe(
    "Min is 0",
  );
  expect("clamped" in strings.fields).toBe(false); // "R goes from 0 to 1000. We used 1000." retired
  // A held step that stops on a bound is a clamp too (m6).
  const stepped = statusOf({ kind: "ok", value: 1000 }, true);
  expect(messageOf(stepped, 1000, R, copy)).toBe("Max is 1,000");
  // The note lasts until the next edit (afterEdit); Form 2i: an invalid entry's note too.
  expect(afterEdit(noted)).toEqual({ kind: "ok" });
  expect(afterEdit(statusOf({ kind: "invalid" }, false))).toEqual({ kind: "ok" });
  const fine = { kind: "ok" } as const;
  expect(afterEdit(fine)).toBe(fine);
  // The field clears it on change only: blur keeps it, so a blur clamp is still seen.
  const src = await (
    await import("bun")
  )
    .file(`${import.meta.dir}/../../src/v2/design/primitives/NumberField/NumberField.tsx`)
    .text();
  expect(src.split("setStatus(afterEdit)").length - 1).toBe(1);
  const blur = src.slice(src.indexOf("onBlur="), src.indexOf("onFocus="));
  expect(blur.includes("afterEdit")).toBe(false);
  expect(src.includes("clampMessage")).toBe(false);
  expect(src.includes("statusOf(result, stepped && atBound.current)")).toBe(true);
});

test("Form 4f: numbers in the limit note are grouped like other at-rest text", () => {
  expect(strings.fields.limit(true, 10_000)).toBe("Max is 10,000");
  expect(strings.fields.limit(true, 1000)).toBe("Max is 1,000");
  expect(strings.fields.limit(false, 1.01)).toBe("Min is 1.01");
  expect(strings.fields.limit(false, -12_000)).toBe("Min is -12,000");
  expect(strings.fields.limit(true, 12.3456, 2)).toBe("Max is 12.35"); // the field's rest places
  expect(strings.fields.limit(true, 1e300)).toBe("Max is 1\u00A0×\u00A010³⁰⁰");
});

test("Form 2e/2g: in every numeric field a comma is only thousands grouping", async () => {
  const { messageOf, statusOf } = await import("../../src/v2/design/primitives/NumberField/status");
  const SAMPLES = { min: 1, max: 10_000 };
  const HALVINGS = { min: 2, max: 3 };
  const R = { min: 0, max: 1000 };
  const WIDE = { min: -1e7, max: 1e7 };
  for (const text of ["1,000", "10,000", " 1,000 ", "\u22121,000", "1,000,000"]) {
    expect(resolveEntry(text, "int", WIDE, null).kind).toBe("ok");
    expect(resolveEntry(text, "float", WIDE, null).kind).toBe("ok");
  }
  expect(resolveEntry("1,000.5", "float", WIDE, null)).toEqual({ kind: "ok", value: 1000.5 });
  expect(resolveEntry("1,000", "int", SAMPLES, null)).toEqual({ kind: "ok", value: 1000 });
  for (const text of ["2,5", "1,00", ",5", "1,0000", "12,34,567", "2,"]) {
    expect(resolveEntry(text, "int", SAMPLES, null)).toEqual({ kind: "invalid", reason: "whole" });
    // A count field (float parse, whole) too.
    expect(resolveEntry(text, "float", HALVINGS, null, true)).toEqual({
      kind: "invalid",
      reason: "whole",
    });
    // 2g: a decimal field too, never read as 25 or 2.5.
    expect(resolveEntry(text, "float", R, null)).toEqual({ kind: "invalid", reason: "dot" });
  }
  // 2g: a fraction in a whole-number field is "whole", not the long invalid message.
  for (const text of ["1.5", "0.1", "2.50", "1.5e0"]) {
    expect(resolveEntry(text, "int", SAMPLES, null)).toEqual({ kind: "invalid", reason: "whole" });
  }
  expect(resolveEntry("2.0", "int", SAMPLES, null)).toEqual({ kind: "ok", value: 2 });
  expect(resolveEntry("abc", "int", SAMPLES, null)).toEqual({ kind: "invalid" });
  expect(resolveEntry("abc", "float", R, null)).toEqual({ kind: "invalid" });
  // The field keeps its last value and shows the short note.
  const copy = {
    invalidMessage: () => "long",
    wholeMessage: strings.fields.wholeOnly,
    dotMessage: strings.fields.dotOnly,
  };
  const say = (text: string, parse: "int" | "float", b: { min: number; max: number }) =>
    messageOf(statusOf(resolveEntry(text, parse, b, null), false), 500, b, copy);
  expect(say("2,5", "int", SAMPLES)).toBe("Whole numbers only");
  expect(say("1.5", "int", SAMPLES)).toBe("Whole numbers only");
  expect(say("2,5", "float", R)).toBe("Use a dot for decimals");
  expect(say("abc", "float", R)).toBe("long"); // the field's own copy (the sheet: "Numbers only")
  expect(strings.fields.dotOnly).toBe("Use a dot for decimals");
});

test("Form 4g: from 1e9 up the focused ×10 form is the full stored precision; e and ^ forms parse", () => {
  // Focused (editNumber) vs at rest (showNumber, 3 figures).
  expect(editNumber(1_234_567_890_123.456)).toBe("1.234567890123456\u00A0×\u00A010¹²");
  expect(showNumber(1_234_567_890_123.456)).toBe("1.23\u00A0×\u00A010¹²");
  for (const n of [1e9, 1_234_567_890, 9.87654321e20, 1.7976931348623157e308, -4.56789e15]) {
    expect(parseNumber(editNumber(n), "float")).toBe(n); // the draft round-trips exactly
  }
  const at = 1.5e9;
  for (const text of [
    "1.5e9",
    "1.5E9",
    "1.5e+9",
    "1.5 × 10^9",
    "1.5×10^9",
    "1.5 x 10^9",
    "1.5*10^9",
    "1.5\u00A0×\u00A010⁹",
    "1,500,000,000",
  ]) {
    expect(parseNumber(text, "float")).toBe(at);
  }
  expect(parseNumber("2.5 × 10^-3", "float")).toBe(0.0025);
  expect(parseNumber("\u22121.5 × 10^9", "float")).toBe(-at);
  expect(Number.isNaN(parseNumber("1.5 × 10^", "float"))).toBe(true);
  expect(Number.isNaN(parseNumber("1.5 × 10^9.5", "float"))).toBe(true);
  expect(resolveEntry("1.5 × 10^9", "float", { min: 0, max: Infinity }, null)).toEqual({
    kind: "ok",
    value: at,
  });
});

test("Form 2h: Previous Halvings rejects '1.5' with 'Whole numbers only'; a count is never rounded", async () => {
  const { messageOf, statusOf } = await import("../../src/v2/design/primitives/NumberField/status");
  const HALVINGS = { min: 2, max: 3 };
  for (const text of ["1.5", "2.5", "2.4", "3.7", "2.0001", "2.5e0"]) {
    expect(resolveEntry(text, "float", HALVINGS, null, true)).toEqual({
      kind: "invalid",
      reason: "whole",
    });
  }
  const copy = { invalidMessage: () => "long", wholeMessage: strings.fields.wholeOnly };
  const status = statusOf(resolveEntry("1.5", "float", HALVINGS, null, true), false);
  expect(messageOf(status, 2, HALVINGS, copy)).toBe("Whole numbers only");
  // Whole text still commits, and still clamps.
  expect(resolveEntry("3", "float", HALVINGS, null, true)).toEqual({ kind: "ok", value: 3 });
  expect(resolveEntry("2.0", "float", HALVINGS, null, true)).toEqual({ kind: "ok", value: 2 });
  expect(resolveEntry("4", "float", HALVINGS, null, true)).toEqual({
    kind: "clamped",
    value: 3,
    typed: 4,
  });
  const src = await (
    await import("bun")
  )
    .file(`${import.meta.dir}/../../src/v2/design/primitives/NumberField/entry.ts`)
    .text();
  expect(src.includes("Math.round(parsed)")).toBe(false);
});

test("Form 4h: an outside value change clears the clamp note; the field's own commit keeps it", async () => {
  const { afterValue, messageOf, statusOf } =
    await import("../../src/v2/design/primitives/NumberField/status");
  const R = { min: 0, max: 1000 };
  const noted = statusOf(resolveEntry("5000", "float", R, null), false);
  const copy = {
    limitNote: (used: number, b: { min: number; max: number }) =>
      strings.fields.limit(used === b.max, used),
  };
  expect(messageOf(noted, 1000, R, copy)).toBe("Max is 1,000");
  // Its own commit lands (value === the value it sent): the note stays.
  expect(afterValue(noted, 1000, 1000)).toBe(noted);
  // A model switch (nothing sent, or another value): cleared, never describing a stale value.
  expect(afterValue(noted, 20, null)).toEqual({ kind: "ok" });
  expect(afterValue(noted, 20, 1000)).toEqual({ kind: "ok" });
  expect(afterValue(noted, 1000, null)).toEqual({ kind: "ok" });
  // Form 2i: an invalid entry's note clears per 4h too (it sent nothing, so any value is outside).
  const bad = statusOf({ kind: "invalid", reason: "whole" }, false);
  expect(afterValue(bad, 20, null)).toEqual({ kind: "ok" });
  // Wired in the value effect, before the focus check, so a focused field clears too.
  const src = await (
    await import("bun")
  )
    .file(`${import.meta.dir}/../../src/v2/design/primitives/NumberField/NumberField.tsx`)
    .text();
  const effect = src.slice(src.indexOf("Form 4h"), src.indexOf("}, [value]);"));
  const clear = effect.indexOf("setStatus((was) => afterValue(was, value, own))");
  expect(clear > 0 && clear < effect.indexOf("document.activeElement")).toBe(true);
  expect(effect.indexOf("const own = sent.current") < effect.indexOf("sent.current = null")).toBe(
    true,
  );
});

const keypad = (props: Record<string, unknown>) =>
  renderToStaticMarkup(
    createElement(NumberField, { id: "k", label: "K", value: 2, ...props }),
  ).match(/inputmode="(\w+)"/i)?.[1];

test("F8-1: whole-number fields (int parse or whole count) ask for the numeric keypad; decimals for decimal", () => {
  expect(keypad({ whole: true })).toBe("numeric");
  expect(keypad({ parse: "int" })).toBe("numeric");
  expect(keypad({})).toBe("decimal");
});

test("Form 2j: text that isn't a number shows 'Numbers only'; overflow clamps with 'Max is …' / 'Min is …'", async () => {
  const { messageOf, statusOf } = await import("../../src/v2/design/primitives/NumberField/status");
  const { overflowOf } = await import("../../src/v2/design/primitives/NumberField/entry");
  const SAMPLES = { min: 1, max: 10_000 };
  const R = { min: 0, max: 1000 };
  const copy = {
    limitNote: (used: number, b: { min: number; max: number }) =>
      strings.fields.limit(used === b.max, used),
    invalidMessage: () => strings.fields.numbersOnly,
    wholeMessage: strings.fields.wholeOnly,
    dotMessage: strings.fields.dotOnly,
  };
  const say = (text: string, parse: "int" | "float", b: { min: number; max: number }) => {
    const result = resolveEntry(text, parse, b, null);
    return [result, messageOf(statusOf(result, false), 500, b, copy)] as const;
  };
  // Non-numeric text and a lone sign: invalid, "Numbers only" (empty is 2l, below).
  for (const text of ["abc", "2x", "-", "+", ".", "1e", "Infinity", "-Infinity", "NaN"]) {
    for (const [parse, b] of [
      ["float", R],
      ["int", SAMPLES],
    ] as const) {
      const [result, note] = say(text, parse, b);
      expect(result).toEqual({ kind: "invalid" });
      expect(note).toBe("Numbers only");
    }
  }
  // Overflow is out of range, not invalid: it clamps to that field's real max (or min).
  expect(say("1e309", "float", R)).toEqual([
    { kind: "clamped", value: 1000, typed: Infinity },
    "Max is 1,000",
  ]);
  expect(say("1e309", "int", SAMPLES)).toEqual([
    { kind: "clamped", value: 10_000, typed: Infinity },
    "Max is 10,000",
  ]);
  expect(say("-1e309", "float", R)).toEqual([
    { kind: "clamped", value: 0, typed: -Infinity },
    "Min is 0",
  ]);
  expect(say("1 × 10^400", "float", R)[1]).toBe("Max is 1,000");
  // Only a numeral overflows: never "Infinity", hex or junk.
  expect([overflowOf("1e309"), overflowOf("-1e309"), overflowOf("1e308")]).toEqual([
    Infinity,
    -Infinity,
    undefined,
  ]);
  expect([overflowOf("Infinity"), overflowOf("1e309x"), overflowOf("0x1")]).toEqual([
    undefined,
    undefined,
    undefined,
  ]);
  // An Infinity bound on that side has no value to use: nothing commits (never Infinity or NaN).
  expect(resolveEntry("1e309", "float", FLOOR, null)).toEqual({ kind: "invalid", reason: "large" });
  expect(resolveEntry("-1e309", "float", FLOOR, null)).toEqual({
    kind: "clamped",
    value: 1.01,
    typed: -Infinity,
  });
  // FL-001 still holds: no silent 1e9 → 1 (it clamps, and says so), underflow is just 0.
  expect(say("1e9", "float", { min: 0, max: 1 })).toEqual([
    { kind: "clamped", value: 1, typed: 1e9 },
    "Max is 1",
  ]);
  expect(resolveEntry("1e-400", "float", R, null)).toEqual({ kind: "ok", value: 0 });
  // The short notes of 2g are unchanged.
  expect(say("2,5", "float", R)[1]).toBe("Use a dot for decimals");
  expect(say("1.5", "int", SAMPLES)[1]).toBe("Whole numbers only");
});

test("Form 2i: focus leaving after an invalid entry shows the last committed value; the note stays until 4h clears it", async () => {
  const { afterEdit, afterValue, messageOf, statusOf } =
    await import("../../src/v2/design/primitives/NumberField/status");
  const R = { min: 0, max: 1000 };
  const copy = { invalidMessage: () => strings.fields.numbersOnly };
  // Blur commits the draft: invalid, the note shows; blur itself never clears it (no afterEdit).
  for (const text of ["abc", "2x", "-"]) {
    const status = statusOf(resolveEntry(text, "float", R, null), false);
    expect(messageOf(status, 12.5, R, copy)).toBe("Numbers only");
    // 4h: cleared by the next edit, or by a value from anywhere else (a model switch).
    expect(afterEdit(status)).toEqual({ kind: "ok" });
    expect(afterValue(status, 20, null)).toEqual({ kind: "ok" });
  }
  // The field: blur after an invalid commit puts the value in use back in the draft, whose
  // unfocused display is the resting text of that value (never the rejected text).
  const src = await (
    await import("bun")
  )
    .file(`${import.meta.dir}/../../src/v2/design/primitives/NumberField/NumberField.tsx`)
    .text();
  const blur = src.slice(src.indexOf("onBlur="), src.indexOf("onFocus="));
  expect(blur.includes('if (commit(draft) === "invalid") revert();')).toBe(true);
  expect(blur.includes("afterEdit") || blur.includes("setStatus")).toBe(false); // the note stays
  const revert = src.slice(src.indexOf("const revert = "), src.indexOf("const commitRef"));
  expect(revert.includes("clean.current = editNumber(live.current.value);")).toBe(true);
  expect(revert.includes("setDraft(clean.current);")).toBe(true);
  expect(
    src.includes(
      "const display = focused || draft !== clean.current ? draft : shownAt(places)(value);",
    ),
  ).toBe(true);
  // An invalid commit returns before touching the value or the draft (nothing sent, never NaN).
  const commit = src.slice(src.indexOf("const commit = "), src.indexOf("const revert = "));
  const bail = commit.indexOf('if (result.kind === "invalid") return result.kind;');
  expect(bail > 0 && bail < commit.indexOf("onCommit?.(")).toBe(true);
  // SSR at rest shows the committed value's resting text.
  const html = renderToStaticMarkup(
    createElement(NumberField, { id: "r", label: "R (%)", value: 12.5, places: 2 }),
  );
  expect(html.includes('value="12.5"')).toBe(true);
});

test("Form 2k: '1e309' with no maximum says 'Too large', commits nothing; '-1e309' still clamps to the min", async () => {
  const { messageOf, statusOf } = await import("../../src/v2/design/primitives/NumberField/status");
  const copy = {
    limitNote: (used: number, b: { min: number; max: number }) =>
      strings.fields.limit(used === b.max, used),
    invalidMessage: () => strings.fields.numbersOnly,
    largeMessage: strings.fields.tooLarge,
    emptyMessage: strings.fields.enterNumber,
  };
  // +/- (min 1.01, no max) and a model variable ("Infinity" rangeMax, min 0).
  for (const b of [FLOOR, { min: 0, max: Number.POSITIVE_INFINITY }]) {
    for (const text of [
      "1e309",
      "1E309",
      "+1e309",
      "1 × 10^400",
      "1\u00A0×\u00A010⁴⁰⁰",
      " 1e309 ",
    ]) {
      const result = resolveEntry(text, "float", b, null);
      expect(result).toEqual({ kind: "invalid", reason: "large" });
      const status = statusOf(result, false);
      expect(messageOf(status, 2, b, copy)).toBe("Too large");
      expect(messageOf(status, 2, b, copy) === "Numbers only").toBe(false); // it is a number
    }
    // '-1e309' clamps to the min, as built.
    const low = resolveEntry("-1e309", "float", b, null);
    expect(low).toEqual({ kind: "clamped", value: b.min, typed: -Infinity });
    expect(messageOf(statusOf(low, false), 2, b, copy)).toBe(`Min is ${String(b.min)}`);
  }
  // Just under the double range is an ordinary huge value, kept as typed.
  expect(resolveEntry("1e308", "float", FLOOR, null)).toEqual({ kind: "ok", value: 1e308 });
  // With a finite max, overflow still clamps (2j), never "Too large".
  expect(resolveEntry("1e309", "float", { min: 0, max: 1000 }, null)).toEqual({
    kind: "clamped",
    value: 1000,
    typed: Infinity,
  });
  // Without the 2k copy the note falls back to the field's invalid message, never blank.
  const bare = statusOf(resolveEntry("1e309", "float", FLOOR, null), false);
  expect(messageOf(bare, 2, FLOOR, { invalidMessage: () => "Numbers only" })).toBe("Numbers only");
  expect(strings.fields.tooLarge).toBe("Too large");
});

test("Form 2l: an empty field (or only spaces) where empty isn't allowed says 'Enter a number'; blur reverts", async () => {
  const { afterEdit, afterValue, messageOf, statusOf } =
    await import("../../src/v2/design/primitives/NumberField/status");
  const R = { min: 0, max: 1000 };
  const copy = {
    invalidMessage: () => strings.fields.numbersOnly,
    largeMessage: strings.fields.tooLarge,
    emptyMessage: strings.fields.enterNumber,
  };
  for (const text of ["", " ", "   ", "\t", "\u00A0", "\u202F\u2009", ",", " , "]) {
    for (const parse of ["float", "int"] as const) {
      const result = resolveEntry(text, parse, R, null);
      if (text.includes(",")) {
        // A lone comma isn't thousands grouping (2g): its own note, not 2l's.
        expect(result.kind).toBe("invalid");
        continue;
      }
      expect(result).toEqual({ kind: "invalid", reason: "empty" });
      const status = statusOf(result, false);
      expect(messageOf(status, 12.5, R, copy)).toBe("Enter a number");
      // The note clears like every other (4h/4i).
      expect(afterEdit(status)).toEqual({ kind: "ok" });
      expect(afterValue(status, 20, null)).toEqual({ kind: "ok" });
    }
  }
  // Where empty is allowed, it commits the field's emptyValue: no note at all.
  expect(resolveEntry("  ", "int", R, 1000)).toEqual({ kind: "ok", value: 1000 });
  // A lone sign is not empty: "Numbers only".
  expect(messageOf(statusOf(resolveEntry("-", "float", R, null), false), 1, R, copy)).toBe(
    "Numbers only",
  );
  expect(strings.fields.enterNumber).toBe("Enter a number");
  // Blur after empty: the draft "" differs from the committed text, so blur commits it, gets
  // "invalid" and reverts to the value in use (2i); the note stays.
  const src = await (
    await import("bun")
  )
    .file(`${import.meta.dir}/../../src/v2/design/primitives/NumberField/NumberField.tsx`)
    .text();
  const blur = src.slice(src.indexOf("onBlur="), src.indexOf("onFocus="));
  expect(blur.includes('draft !== clean.current || status.kind === "invalid"')).toBe(true);
  expect(blur.includes('if (commit(draft) === "invalid") revert();')).toBe(true);
  // The Models sheet hands the field all three notes.
  const sheet = await (
    await import("bun")
  )
    .file(`${import.meta.dir}/../../src/v2/app/models/ModelsSheet.tsx`)
    .text();
  expect(sheet.includes("largeMessage={strings.fields.tooLarge}")).toBe(true);
  expect(sheet.includes("emptyMessage={strings.fields.enterNumber}")).toBe(true);
});

test("Form 2m: Enter on invalid text keeps the typed text while focused; only blur reverts it", async () => {
  const src = await (
    await import("bun")
  )
    .file(`${import.meta.dir}/../../src/v2/design/primitives/NumberField/NumberField.tsx`)
    .text();
  // Enter commits the draft and stops: no revert, no draft reset.
  const keyDown = src.slice(
    src.indexOf("const onKeyDown = "),
    src.indexOf('if (event.key === "Escape")'),
  );
  const enter = keyDown.slice(keyDown.indexOf('if (event.key === "Enter")'));
  expect(enter.includes("commit(live.current.draft, stepped);")).toBe(true);
  expect(enter.includes("revert") || enter.includes("setDraft")).toBe(false);
  // An invalid commit returns before it touches the draft, so the typed text stays to fix.
  const commit = src.slice(src.indexOf("const commit = "), src.indexOf("const revert = "));
  const bail = commit.indexOf('if (result.kind === "invalid") return result.kind;');
  expect(bail > 0 && bail < commit.indexOf("setDraft(")).toBe(true);
  // While focused, the field shows the draft (the typed text).
  expect(src.includes("const display = focused || draft !== clean.current ? draft :")).toBe(true);
  // revert is called from blur only.
  expect(src.split("revert()").length - 1).toBe(1);
  const blur = src.slice(src.indexOf("onBlur="), src.indexOf("onFocus="));
  expect(blur.includes("revert()")).toBe(true);
});
