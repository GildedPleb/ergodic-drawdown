import { expect, test } from "bun:test";

import { acquire } from "../src/engine/memory";

const slot = () => ({ checkedOut: null, held: null, spare: null, spareOut: null, waiter: null });
const BYTES = Float64Array.BYTES_PER_ELEMENT;
const GROWTH = 1.5;
const sizeFor = (bytes: number): number => {
  const loan = acquire(slot(), bytes);
  loan?.release();
  return loan?.buffer.byteLength ?? -1;
};

test("a sample spinner from 1 to 2000 replaces the band buffer O(log n) times", () => {
  const s = slot();
  const seen = new Set<SharedArrayBuffer>();
  const weeks = 208;
  for (let samples = 1; samples <= 2000; samples++) {
    const bytes = BYTES * weeks * samples;
    const loan = acquire(s, bytes);
    if (loan === null) throw new Error("missing loan");
    seen.add(loan.buffer);
    expect(loan.buffer.byteLength >= bytes && loan.buffer.byteLength % BYTES === 0).toBe(true);
    // Callers see exactly what they asked for, as they did with exact buffers.
    expect(loan.view.length).toBe(weeks * samples);
    expect(loan.view.byteLength).toBe(bytes);
    loan.release();
  }
  // 1.5x per replacement: ceil(log1.5(2000)) = 19, plus the first buffer.
  expect(seen.size <= Math.ceil(Math.log(2000) / Math.log(GROWTH)) + 1).toBe(true);
  // Down again: no new buffer, the views shrink.
  for (let samples = 2000; samples >= 1; samples -= 7) {
    const loan = acquire(s, BYTES * weeks * samples);
    if (loan === null) throw new Error("missing loan");
    seen.add(loan.buffer);
    expect(loan.view.length).toBe(weeks * samples);
    loan.release();
  }
  expect(seen.size <= Math.ceil(Math.log(2000) / Math.log(GROWTH)) + 1).toBe(true);
});

test("capacity is 1.5x the request, aligned to a Float64", () => {
  expect([sizeFor(8), sizeFor(80), sizeFor(24)]).toEqual([16, 120, 40]);
});

test("one pooled spare serves every wave that overlaps the checked-out buffer", () => {
  const s = slot();
  const held = acquire(s, BYTES * 100);
  if (held === null) throw new Error("missing loan");
  const spares = new Set<SharedArrayBuffer>();
  for (let wave = 0; wave < 50; wave++) {
    const spare = acquire(s, BYTES * (160 + wave));
    if (spare === null) throw new Error("missing spare");
    spares.add(spare.buffer);
    expect(spare.view.length).toBe(160 + wave);
    // A third wave waits.
    expect(acquire(s, BYTES)).toBe(null);
    spare.release();
  }
  // The first spare holds 1.5x of 160 elements, so 160..209 all fit it.
  expect(spares.size).toBe(1);
  expect(spares.has(held.buffer)).toBe(false);
  held.release();
  // The idle spare is larger now: a bigger request swaps it in instead of allocating.
  const spareBuffer = [...spares][0];
  const next = acquire(s, BYTES * 200);
  expect(next?.buffer).toBe(spareBuffer);
  expect(next?.view.length).toBe(200);
  expect(next?.buffer === held.buffer).toBe(false);
});

test("headroom stops at the largest possible request", () => {
  // Every sample over every week: no band request is larger, so 1.5x past it is never read.
  // Record the requested length instead of reserving half a gigabyte per case.
  const largest = BYTES * 30 * 208 * 10_000;
  const requested: number[] = [];
  const Real = globalThis.SharedArrayBuffer;
  globalThis.SharedArrayBuffer = class extends Real {
    constructor(length?: number) {
      requested.push(length ?? 0);
      super(0);
    }
  };
  try {
    for (const bytes of [largest * 0.8, largest, largest + BYTES]) {
      // The zero-length stand-in cannot back the view, so the loan itself throws.
      expect(() => acquire(slot(), bytes)).toThrow();
    }
  } finally {
    globalThis.SharedArrayBuffer = Real;
  }
  // Past the cap the request is still served exactly.
  expect(requested).toEqual([largest, largest, largest + BYTES]);
});
