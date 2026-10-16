import { type SignalState } from "./types";

export const cancelBoard = (slots: number): Uint32Array =>
  new Uint32Array(new SharedArrayBuffer(slots * Uint32Array.BYTES_PER_ELEMENT));

export const cancelSignal = (
  board: Uint32Array,
  slot: number,
  generation: number,
): SignalState => ({
  get aborted() {
    return Atomics.load(board, slot) !== generation;
  },
});
