// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable functional/functional-parameters */
import {
  DEFAULT_SIMULATION_COUNT,
  MAX_EPOCH_COUNT,
  WEEKS_PER_EPOCH,
} from "../constants";

// let count = 0;

export default class SharedStackCache {
  private readonly sharedBuffer: SharedArrayBuffer;

  private readonly view: Float64Array;

  private width: number;

  private readonly height: number = DEFAULT_SIMULATION_COUNT;

  private readonly maxWidth: number = MAX_EPOCH_COUNT;

  private readonly itemLength: number;

  constructor(
    sharedBuffer: SharedArrayBuffer,
    initialWidth: number,
    itemLength = WEEKS_PER_EPOCH,
  ) {
    this.sharedBuffer = sharedBuffer;
    this.width = Math.min(initialWidth, this.maxWidth);
    this.itemLength = itemLength;
    this.validateBufferSize();
    this.view = new Float64Array(this.sharedBuffer);

    // if (count === 0) {
    //   count++;
    //   setTimeout(() => {
    //     console.time("COPY ARRAY TEST");
    //     console.log({ width: this.width });

    //     // Create a new SharedArrayBuffer with double the width
    //     const newWidth = this.width * 1.1;
    //     const newBufferSize = this.sharedBuffer.byteLength * 1.1;
    //     const newSharedBuffer = new SharedArrayBuffer(newBufferSize);
    //     const newView = new Float64Array(newSharedBuffer);

    //     // Calculate dimensions
    //     const rowLength = this.width * this.itemLength;
    //     const newRowLength = newWidth * this.itemLength;
    //     const height = this.view.length / rowLength;

    //     // Copy data row by row
    //     for (let y = 0; y < height; y++) {
    //       const sourceStart = y * rowLength;
    //       const destinationStart = y * newRowLength;

    //       // Copy the original row data
    //       newView.set(
    //         this.view.subarray(sourceStart, sourceStart + rowLength),
    //         destinationStart,
    //       );
    //     }
    //     console.timeEnd("COPY ARRAY TEST");
    //   }, 5000);
    // }
  }

  get(x: number, y: number): Float64Array | undefined {
    if (!this.isValidPosition(x, y)) return undefined;
    const start = this.getIndex(x, y);
    const end = start + this.itemLength;
    const slice = this.view.subarray(start, end);
    return slice.at(-1) === 0 || slice.at(-1) === undefined ? undefined : slice;
  }

  getRow(y: number, getZero = false): Float64Array | undefined {
    if (y < 0 || y >= this.height) return undefined;
    const start = this.getIndex(0, y);
    const end = start + this.width * this.itemLength;
    const row = this.view.subarray(start, end);
    return (row.at(-1) === 0 && !getZero) || row.at(-1) === undefined
      ? undefined
      : row;
  }

  set(x: number, y: number, value: Float64Array): void {
    this.validateSetParameters(x, y, value);
    const start = this.getIndex(x, y);
    this.view.set(value, start);
  }

  setRow(y: number, value: Float64Array): void {
    this.validateSetRowParameters(y, value);
    const start = this.getIndex(0, y);
    this.view.set(value, start);
  }

  clear(): void {
    this.view.fill(0);
  }

  resizeWidth(newWidth: number): void {
    this.width = Math.min(Math.max(newWidth, 1), this.maxWidth);
  }

  getSharedBuffer(): SharedArrayBuffer {
    return this.sharedBuffer;
  }

  private getIndex(x: number, y: number): number {
    return (y * this.maxWidth + x) * this.itemLength;
  }

  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private validateBufferSize(): void {
    const totalElements = this.height * this.width * this.itemLength;
    const requiredByteLength = totalElements * Float64Array.BYTES_PER_ELEMENT;
    if (this.sharedBuffer.byteLength < requiredByteLength) {
      throw new Error(
        `SharedArrayBuffer is too small for the maximum dimensions--
         shared buffer byte length: ${this.sharedBuffer.byteLength.toLocaleString()}
         required byte length: ${requiredByteLength.toLocaleString()}
         height: ${this.height}
         width: ${this.width}
         multiplier: ${this.itemLength}
        `,
      );
    }
  }

  private validateSetParameters(
    x: number,
    y: number,
    value: Float64Array,
  ): void {
    if (x < 0 || y < 0 || value.length !== this.itemLength) {
      throw new Error(
        `Invalid parameters: Ensure that x, y are non-negative and value has length equal to ${this.itemLength}. Got: x "${x}", y "${y}", length "${value.length}"`,
      );
    }
    if (x >= this.width || y >= this.height) {
      throw new Error(
        `Set Position out of bounds: got, x "${x}", y "${y}". Needed: x < ${this.width}, y < ${this.height}`,
      );
    }
  }

  private validateSetRowParameters(y: number, value: Float64Array): void {
    if (y < 0 || y >= this.height) {
      throw new Error(
        `Invalid row index: Ensure that y is non-negative and less than ${this.height}. Got: y "${y}"`,
      );
    }
    if (value.length !== this.width * this.itemLength) {
      throw new Error(
        `Invalid value length: Expected ${this.width * this.itemLength} elements (${this.width} * ${this.itemLength}), but got ${value.length}`,
      );
    }
  }
}
