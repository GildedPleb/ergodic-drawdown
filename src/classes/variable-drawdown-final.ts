import { MAX_FIAT_VARIABLES } from "../constants";
import type VariableDrawdownCache from "./variable-drawdown-cache";

export class VariableDrawdownFinal {
  // New static method to create an instance from exported state
  static fromExportedState(state: {
    buffer: SharedArrayBuffer;
    sampleCount: number;
    weekCount: number;
  }): VariableDrawdownFinal {
    return new VariableDrawdownFinal(
      // eslint-disable-next-line unicorn/no-null
      null,
      state.weekCount,
      state.sampleCount,
      state.buffer,
    );
  }

  private readonly buffer: SharedArrayBuffer;

  private view: Float64Array;

  private readonly weekCount: number;

  private readonly sampleCount: number;

  constructor(
    variableDrawdownCaches: VariableDrawdownCache[] | null,
    weekCount: number,
    sampleCount: number,
    existingBuffer?: SharedArrayBuffer,
  ) {
    if (weekCount > MAX_FIAT_VARIABLES) throw new Error("Too many weeks");
    this.weekCount = weekCount;
    this.sampleCount = sampleCount;

    if (existingBuffer === undefined) {
      const bufferSize =
        this.sampleCount * weekCount * 2 * Float64Array.BYTES_PER_ELEMENT;
      this.buffer = new SharedArrayBuffer(bufferSize);
    } else {
      this.buffer = existingBuffer;
    }

    this.view = new Float64Array(this.buffer);

    if (existingBuffer === undefined) {
      this.view.fill(-1);
      if (variableDrawdownCaches !== null) {
        this.populateCache(variableDrawdownCaches);
      }
    }
  }

  get(sample: number, week: number): number | undefined {
    if (sample < 0 || sample >= this.sampleCount) {
      throw new Error("Sample index out of bounds.");
    }

    const startIndex = sample * this.weekCount * 2;
    const endIndex = startIndex + this.weekCount * 2;

    for (let index = startIndex; index < endIndex; index += 2) {
      const currentWeek = this.view[index];
      if (currentWeek === week) {
        return this.view[index + 1];
      }
      if (currentWeek === -1) {
        return undefined;
      }
    }
    return undefined;
  }

  // eslint-disable-next-line functional/functional-parameters
  exportState(): {
    buffer: SharedArrayBuffer;
    sampleCount: number;
    weekCount: number;
  } {
    return {
      buffer: this.buffer,
      sampleCount: this.sampleCount,
      weekCount: this.weekCount,
    };
  }

  private set(sample: number, week: number, amount: number): void {
    if (sample < 0 || sample >= this.sampleCount) {
      throw new Error("Sample index out of bounds.");
    }

    const startIndex = sample * this.weekCount * 2;
    const endIndex = startIndex + this.weekCount * 2;

    for (let index = startIndex; index < endIndex; index += 2) {
      const currentWeek = this.view[index];
      if (currentWeek === week) {
        // Week found, update amount
        this.view[index + 1] += amount;
        return;
      }
      if (currentWeek === -1) {
        // Empty slot found, add new week-amount pair
        this.view[index] = week;
        this.view[index + 1] = amount;
        return;
      }
    }
    // If we reach here, there's no space for a new week
    throw new Error(`No space available for new week in sample ${sample}`);
  }

  private populateCache(caches: VariableDrawdownCache[]): void {
    for (let sample = 0; sample < this.sampleCount; sample++) {
      for (const cache of caches) {
        const [week, amount] = cache.get(sample);
        if (week !== -1) {
          this.set(sample, week, amount);
        }
      }
    }
  }

  // New method to export internal details
}
