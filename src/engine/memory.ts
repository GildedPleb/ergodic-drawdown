import GrowableSharedArray from "../classes/growable-shared-array";
import VariableDrawdownCache from "../classes/variable-drawdown-cache";
import { type VariableDrawdownFinal } from "../classes/variable-drawdown-final";
import { DEFAULT_EPOCH_COUNT, DEFAULT_SIMULATION_COUNT, WEEKS_PER_EPOCH } from "../constants";
import { WALK_STATE_LENGTH } from "../data/walks/prng";

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
}

interface BufferSlot {
  checkedOut: SharedArrayBuffer | null;
  held: SharedArrayBuffer | null;
}

interface Loan {
  buffer: SharedArrayBuffer;
  release: () => void;
}

interface YSlot {
  key: string;
  values: Float64Array | null;
}

export type BandCharacter = "drawdown" | "price";
export type BandKind = "quantile" | "sd";

const emptySlot = (): BufferSlot => ({ checkedOut: null, held: null });

const emptyY = (): YSlot => ({ key: "", values: null });

// One high-water buffer per chart per role. A wave that is still being written
// keeps it checked out so the next wave allocates a spare instead of sharing it.
export const bufferSlots: Record<BandCharacter, { grouped: BufferSlot; values: BufferSlot }> = {
  drawdown: { grouped: emptySlot(), values: emptySlot() },
  price: { grouped: emptySlot(), values: emptySlot() },
};

// Last y-values only. Quantile and normal each keep a slot, so toggling back
// does not rerun workers. A new source hash overwrites that slot.
export const ySlots: Record<BandCharacter, Record<BandKind, YSlot>> = {
  drawdown: { quantile: emptyY(), sd: emptyY() },
  price: { quantile: emptyY(), sd: emptyY() },
};

export const acquire = (slot: BufferSlot, bytes: number): Loan => {
  if (slot.checkedOut === null && slot.held !== null && slot.held.byteLength >= bytes) {
    const buffer = slot.held;
    slot.checkedOut = buffer;
    let released = false;
    return {
      buffer,
      release: () => {
        if (released) return;
        released = true;
        if (slot.checkedOut === buffer) slot.checkedOut = null;
      },
    };
  }

  const buffer = new SharedArrayBuffer(bytes);
  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    if (slot.checkedOut === buffer) slot.checkedOut = null;
    if (slot.held === null || buffer.byteLength > slot.held.byteLength) slot.held = buffer;
  };

  if (slot.checkedOut === null) {
    slot.held = buffer;
    slot.checkedOut = buffer;
  }
  return { buffer, release };
};
