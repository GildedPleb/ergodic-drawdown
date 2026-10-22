import GrowableSharedArray from "../classes/growable-shared-array";
import VariableDrawdownCache from "../classes/variable-drawdown-cache";
import { type VariableDrawdownFinal } from "../classes/variable-drawdown-final";
import { DEFAULT_EPOCH_COUNT, DEFAULT_SIMULATION_COUNT, WEEKS_PER_EPOCH } from "../constants";
import { WALK_STATE_LENGTH } from "../data/walks/prng";

export interface BoundSlot {
  key: string;
  logs: Float64Array;
  points: Float64Array;
  seriesHash: string;
  weeks: number;
}

export interface CashflowSlot {
  bitcoin: Float64Array;
  fiat: Float64Array;
  key: string;
  seriesHash: string;
  weeks: number;
}

const emptyBound = (): BoundSlot => ({
  key: "",
  logs: new Float64Array(0),
  points: new Float64Array(0),
  seriesHash: "",
  weeks: 0,
});

const emptyCashflow = (): CashflowSlot => ({
  bitcoin: new Float64Array(0),
  fiat: new Float64Array(0),
  key: "",
  seriesHash: "",
  weeks: 0,
});

export class EngineMemory {
  readonly drawdownData = new GrowableSharedArray(
    DEFAULT_EPOCH_COUNT,
    DEFAULT_SIMULATION_COUNT,
    WEEKS_PER_EPOCH,
  );
  readonly finalVariableCache = new Map<string, VariableDrawdownFinal>();
  readonly simulationData = new GrowableSharedArray(
    DEFAULT_EPOCH_COUNT,
    DEFAULT_SIMULATION_COUNT,
    WEEKS_PER_EPOCH,
  );
  readonly variableDrawdownCache = new Map<string, VariableDrawdownCache>();
  readonly walkState = new GrowableSharedArray(
    DEFAULT_EPOCH_COUNT,
    DEFAULT_SIMULATION_COUNT,
    WALK_STATE_LENGTH,
  );
  // One series each. A module slot would leak across golden cases in one process.
  readonly minSeries: BoundSlot = emptyBound();
  readonly maxSeries: BoundSlot = emptyBound();
  readonly cashflowSeries: CashflowSlot = emptyCashflow();
}

interface Waiter {
  bytes: number;
  resolve: (loan: Loan | null) => void;
  settled: boolean;
  signal: AbortSignal;
  stop: () => void;
}

interface BufferSlot {
  checkedOut: SharedArrayBuffer | null;
  held: SharedArrayBuffer | null;
  spareOut: SharedArrayBuffer | null;
  waiter: Waiter | null;
}

interface Loan {
  buffer: SharedArrayBuffer;
  release: () => void;
}

interface YSlot {
  key: string;
  values: Float64Array | null;
  weeks: number;
}

export type BandCharacter = "drawdown" | "price";
export type BandKind = "quantile" | "sd";

const emptySlot = (): BufferSlot => ({
  checkedOut: null,
  held: null,
  spareOut: null,
  waiter: null,
});

const emptyY = (): YSlot => ({ key: "", values: null, weeks: 0 });

// One high-water buffer per chart per role, and one spare while it is checked
// out. A third wave waits. A held sample spinner must not allocate a buffer
// per tick. The spare stays out until its kernels reply.
export const bufferSlots: Record<BandCharacter, { grouped: BufferSlot; values: BufferSlot }> = {
  drawdown: { grouped: emptySlot(), values: emptySlot() },
  price: { grouped: emptySlot(), values: emptySlot() },
};

// Last y-values only. Quantile and normal each keep a slot, so toggling back
// does not rerun workers. The key is the series, weeksSince, samples, and kind.
// `weeks` is how many chart weeks are stored. A shorter year reads the front.
export const ySlots: Record<BandCharacter, Record<BandKind, YSlot>> = {
  drawdown: { quantile: emptyY(), sd: emptyY() },
  price: { quantile: emptyY(), sd: emptyY() },
};

const settleWaiter = (waiter: Waiter, loan: Loan | null): void => {
  if (waiter.settled) return;
  waiter.settled = true;
  waiter.stop();
  waiter.resolve(loan);
};

const handoff = (slot: BufferSlot): void => {
  const waiter = slot.waiter;
  if (waiter === null) return;
  if (waiter.settled || waiter.signal.aborted) {
    if (slot.waiter === waiter) slot.waiter = null;
    settleWaiter(waiter, null);
    return;
  }
  const next = acquire(slot, waiter.bytes);
  if (next === null) return;
  slot.waiter = null;
  settleWaiter(waiter, next);
};

const loan = (slot: BufferSlot, buffer: SharedArrayBuffer, kind: "checked" | "spare"): Loan => {
  if (kind === "checked") slot.checkedOut = buffer;
  else slot.spareOut = buffer;
  let released = false;
  return {
    buffer,
    release: () => {
      if (released) return;
      released = true;
      if (kind === "checked" && slot.checkedOut === buffer) slot.checkedOut = null;
      if (kind === "spare" && slot.spareOut === buffer) slot.spareOut = null;
      if (slot.held === null || buffer.byteLength > slot.held.byteLength) slot.held = buffer;
      const waiter = slot.waiter;
      if (
        kind === "spare" &&
        slot.checkedOut !== null &&
        slot.spareOut === null &&
        waiter !== null &&
        !waiter.settled &&
        !waiter.signal.aborted &&
        buffer.byteLength >= waiter.bytes &&
        buffer !== slot.checkedOut
      ) {
        slot.waiter = null;
        settleWaiter(waiter, loan(slot, buffer, "spare"));
        return;
      }
      handoff(slot);
    },
  };
};

// Null means both the high-water buffer and the spare are already loaned.
export const acquire = (slot: BufferSlot, bytes: number): Loan | null => {
  if (
    slot.checkedOut === null &&
    slot.held !== null &&
    slot.held !== slot.spareOut &&
    slot.held.byteLength >= bytes
  ) {
    return loan(slot, slot.held, "checked");
  }
  if (slot.checkedOut !== null && slot.spareOut !== null) return null;
  const buffer = new SharedArrayBuffer(bytes);
  if (slot.checkedOut === null) {
    slot.held = buffer;
    return loan(slot, buffer, "checked");
  }
  return loan(slot, buffer, "spare");
};

export const acquireWhenFree = (
  slot: BufferSlot,
  bytes: number,
  signal: AbortSignal,
): Promise<Loan | null> => {
  if (!signal.aborted) {
    const ready = acquire(slot, bytes);
    if (ready !== null) return Promise.resolve(ready);
  }
  if (signal.aborted) return Promise.resolve(null);

  return new Promise((resolve) => {
    const waiter: Waiter = {
      bytes,
      resolve,
      settled: false,
      signal,
      stop: () => {
        signal.removeEventListener("abort", onAbort);
      },
    };
    function onAbort(): void {
      if (slot.waiter === waiter) slot.waiter = null;
      settleWaiter(waiter, null);
    }
    const previous = slot.waiter;
    slot.waiter = waiter;
    if (previous !== null) settleWaiter(previous, null);
    signal.addEventListener("abort", onAbort, { once: true });
  });
};
