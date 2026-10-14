import { MAX_SAMPLE_COUNT } from "../constants";

const findNextGreatest1000 = (x: number, y: number): number => {
  if (x > y) return x;
  if (x <= 0) return Math.min(1000, y);
  let nextThousand = Math.ceil(x / 1000) * 1000;
  if (x % 1000 === 0) nextThousand += 1000;
  return Math.min(nextThousand, y);
};

export default class VariableDrawdownCache {
  private readonly buffer: SharedArrayBuffer;

  private view: Float64Array;

  private cacheHash = "";

  private cacheHeight = 0;

  private cacheWidth = 0;

  constructor(buffer?: SharedArrayBuffer) {
    const maxBufferSize = MAX_SAMPLE_COUNT * 2 * Float64Array.BYTES_PER_ELEMENT;

    if (buffer === undefined) {
      // Create a new SharedArrayBuffer if not provided
      this.buffer = new SharedArrayBuffer(maxBufferSize);
      this.view = new Float64Array(this.buffer).fill(-1);
    } else {
      if (buffer.byteLength !== maxBufferSize) {
        throw new Error(
          `The provided SharedArrayBuffer must have a size of ${maxBufferSize} bytes.`,
        );
      }
      this.buffer = buffer;
      this.view = new Float64Array(this.buffer);
    }
  }

  getValidity(currentHash: string): {
    validHeight: number;
    validWidth: number;
  } {
    if (currentHash === this.cacheHash) {
      return {
        validHeight: this.cacheHeight,
        validWidth: this.cacheWidth,
      };
    }
    return {
      validHeight: 0,
      validWidth: 0,
    };
  }

  setValidity(currentHash: string, newHeight: number, newWidth: number): void {
    this.cacheHash = currentHash;
    this.cacheHeight = findNextGreatest1000(newHeight, this.cacheHeight);
    this.cacheWidth = Math.max(newWidth, this.cacheWidth);

    // why not?:
    // if (this.cacheHash === currentHash) {
    //   this.cacheHeight = Math.max(newHeight, this.cacheHeight);
    //   this.cacheWidth = Math.max(newWidth, this.cacheWidth);
    // } else {
    //   this.cacheHash = currentHash;
    //   this.cacheHeight = newHeight;
    //   this.cacheWidth = newWidth;
    // }
  }

  isFull(): boolean {
    for (let sample = 0; sample < this.cacheHeight; sample++) {
      if (this.view[sample * 2] === -1) return false;
    }
    return true;
  }

  *getEmpty(): Iterable<[number, number]> {
    let start = -1;
    for (let index = 0; index < this.cacheHeight * 2; index += 2) {
      if (this.view[index] === -1) {
        if (start === -1) {
          start = index / 2;
        }
      } else if (start !== -1) {
        yield [start, index / 2];
        start = -1;
      }
    }
    if (start !== -1) {
      yield [start, this.cacheHeight];
    }
  }

  clear(): void {
    this.view.fill(-1);
    this.cacheHash = "";
    this.cacheHeight = 0;
    this.cacheWidth = 0;
  }

  get(sample: number): [week: number, amount: number] {
    if (sample < 0 || sample >= MAX_SAMPLE_COUNT) {
      throw new Error("Sample index out of bounds.");
    }
    const index = sample * 2;
    const week = this.view[index];
    const amount = this.view[index + 1];
    if (week === undefined || amount === undefined) {
      throw new Error("Sample index out of bounds.");
    }
    return [week, amount];
  }

  getGate(): [effective: number, end: number] {
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;
    for (let index = 0; index < this.cacheHeight * 2; index += 2) {
      const week = this.view[index];
      if (week === undefined) continue;
      if (week < min) min = week;
      if (week > max) max = week;
    }
    return [min, max];
  }

  set(sample: number, week: number, amount: number): void {
    if (sample < 0 || sample >= MAX_SAMPLE_COUNT) {
      throw new Error("Sample index out of bounds.");
    }
    const index = sample * 2;
    this.view[index] = week;
    this.view[index + 1] = amount;
  }

  getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }
}
