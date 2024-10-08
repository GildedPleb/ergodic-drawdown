import {
  DEFAULT_SIMULATION_COUNT,
  MAX_EPOCH_COUNT,
  WEEKS_PER_EPOCH,
} from "../constants";

// 1GB
const MAX_BYTE_LENGTH = 1_073_741_824;

// If new size is 1.5x or greater, create new buffer
const GROWTH_FACTOR_THRESHOLD = /^(?:(?!chrome|android).)*safari/i.test(
  navigator.userAgent,
)
  ? 1
  : 1.5;

export interface ExportedState {
  activeHeight: number;
  activeWidth: number;
  cacheHash: string;
  cacheHeight: number;
  cacheWidth: number;
  height: number;
  itemLength: number;
  sharedBuffer: SharedArrayBuffer;
  width: number;
}

export default class GrowableSharedArray {
  static fromExportedState(exportedState: ExportedState): GrowableSharedArray {
    const instance = new GrowableSharedArray(
      exportedState.width,
      exportedState.height,
      exportedState.itemLength,
      exportedState.sharedBuffer,
    );

    instance.cacheWidth = exportedState.cacheWidth;
    instance.cacheHeight = exportedState.cacheHeight;
    instance.activeWidth = exportedState.activeWidth;
    instance.activeHeight = exportedState.activeHeight;
    instance.cacheHash = exportedState.cacheHash;

    return instance;
  }

  private activeWidth: number;

  private activeHeight: number;

  private sharedBuffer: SharedArrayBuffer;

  private view: Float64Array;

  private width: number;

  private height: number;

  private readonly maxHeight: number = 10_000;

  private readonly maxWidth: number = MAX_EPOCH_COUNT;

  private readonly itemLength: number;

  private cacheHash: string;

  private cacheHeight: number;

  private cacheWidth: number;

  constructor(
    initialWidth: number,
    initialHeight: number = DEFAULT_SIMULATION_COUNT,
    itemLength = WEEKS_PER_EPOCH,
    existingBuffer?: SharedArrayBuffer,
  ) {
    this.width = initialWidth;
    this.height = initialHeight;
    this.itemLength = itemLength;
    this.cacheHash = "init";
    this.cacheHeight = 0;
    this.cacheWidth = 0;
    this.activeWidth = initialWidth;
    this.activeHeight = initialHeight;

    this.validateDimensions(this.width, this.height);

    if (existingBuffer === undefined) {
      const initialSize = this.width * this.height * this.itemLength;
      const maxSize = Math.min(
        this.maxWidth *
          this.maxHeight *
          this.itemLength *
          Float64Array.BYTES_PER_ELEMENT,
        MAX_BYTE_LENGTH,
      );
      this.sharedBuffer = new SharedArrayBuffer(
        initialSize * Float64Array.BYTES_PER_ELEMENT,
        // @ts-expect-error This is well supported
        // eslint-disable-next-line es-x/no-resizable-and-growable-arraybuffers
        { maxByteLength: maxSize },
      );
      this.view = new Float64Array(this.sharedBuffer);
    } else {
      this.sharedBuffer = existingBuffer;
      this.view = new Float64Array(this.sharedBuffer);
    }
  }

  // eslint-disable-next-line functional/functional-parameters
  exportState(): ExportedState {
    return {
      activeHeight: this.activeHeight,
      activeWidth: this.activeWidth,
      cacheHash: this.cacheHash,
      cacheHeight: this.cacheHeight,
      cacheWidth: this.cacheWidth,
      height: this.height,
      itemLength: this.itemLength,
      sharedBuffer: this.sharedBuffer,
      width: this.width,
    };
  }

  getValidity(currentHash: string): [validWidth: number, validHeight: number] {
    if (currentHash === this.cacheHash)
      return [this.cacheWidth, this.cacheHeight];
    return [0, 0];
  }

  setValidity(currentHash: string): void {
    if (this.cacheHash === currentHash) {
      this.cacheHeight = Math.max(this.activeHeight, this.cacheHeight);
      this.cacheWidth = Math.max(this.activeWidth, this.cacheWidth);
    } else {
      this.cacheHash = currentHash;
      this.cacheHeight = this.activeHeight;
      this.cacheWidth = this.activeWidth;
    }
  }

  get(x: number, y: number): Float64Array | undefined {
    if (!this.isValidActivePosition(x, y)) return undefined;
    const start = this.getIndex(x, y);
    const end = start + this.itemLength;
    const slice = this.view.subarray(start, end);
    return slice.at(-1) === 0 || slice.at(-1) === undefined ? undefined : slice;
  }

  getRow(y: number, getZero = false): Float64Array | undefined {
    if (y < 0 || y >= this.activeHeight) return undefined;
    const start = this.getIndex(0, y);
    const end = start + this.activeWidth * this.itemLength;
    const row = this.view.subarray(start, end);
    return (row.at(-1) === 0 && !getZero) || row.at(-1) === undefined
      ? undefined
      : row;
  }

  // eslint-disable-next-line functional/functional-parameters
  getLastArray(): Float64Array {
    const result = new Float64Array(this.activeHeight);
    for (let y = 0; y < this.activeHeight; y++) {
      const lastItemIndex =
        this.getIndex(this.activeWidth - 1, y) + this.itemLength - 1;
      result[y] = this.view[lastItemIndex];
    }
    return result;
  }

  set(x: number, y: number, value: Float64Array): void {
    this.validateSetParameters(x, y, value);
    const start = this.getIndex(x, y);
    this.view.set(value, start);
  }

  // eslint-disable-next-line functional/functional-parameters
  clear(): void {
    this.view.fill(0);
    this.cacheHeight = 0;
    this.cacheWidth = 0;
  }

  resize(newActiveWidth: number, newActiveHeight: number): void {
    this.validateDimensions(newActiveWidth, newActiveHeight);

    // Grow the total dimensions if necessary
    if (newActiveWidth > this.width || newActiveHeight > this.height) {
      const newWidth = Math.max(this.width, newActiveWidth);
      const newHeight = Math.max(this.height, newActiveHeight);
      this.ensureCapacity(newWidth, newHeight);

      if (newWidth > this.width) {
        // If growing width, we need to move existing rows to their new positions
        for (let y = this.height - 1; y >= 0; y--) {
          const oldStart = this.getIndex(0, y);
          const newStart = y * newWidth * this.itemLength;
          this.view.copyWithin(
            newStart,
            oldStart,
            oldStart + this.width * this.itemLength,
          );
          // We are setting this to 0, but i feel like we shouldn't have to.
          this.view.fill(
            0,
            newStart + this.width * this.itemLength,
            newStart + newWidth * this.itemLength,
          );
        }
      }

      this.width = newWidth;
      this.height = newHeight;
    }

    // Update active dimensions
    this.activeWidth = newActiveWidth;
    this.activeHeight = newActiveHeight;
  }

  coalesce(lastHalving: number, getZero = false): Float64Array[] {
    const result: Float64Array[] = [];

    for (let y = 0; y < this.height; y++) {
      const row = new Float64Array(this.width * this.itemLength);
      const newRow = this.getRow(y, getZero);
      if (newRow === undefined) continue;
      row.set(newRow);
      result.push(row.subarray(lastHalving));
    }

    return result;
  }

  private ensureCapacity(requiredWidth: number, requiredHeight: number): void {
    const requiredSize = requiredWidth * requiredHeight * this.itemLength;
    if (requiredSize > this.view.length) {
      const newSize = Math.min(
        requiredSize,
        this.maxWidth * this.maxHeight * this.itemLength,
      );
      const newByteLength = newSize * Float64Array.BYTES_PER_ELEMENT;
      if (newByteLength > MAX_BYTE_LENGTH) {
        throw new Error(
          `Requested size exceeds maximum allowed byte length of ${MAX_BYTE_LENGTH}`,
        );
      }

      const growthFactor = newByteLength / this.sharedBuffer.byteLength;

      if (growthFactor >= GROWTH_FACTOR_THRESHOLD) {
        console.log("COPY BUFFER");
        // Create new buffer and copy
        const newBuffer = new SharedArrayBuffer(
          newByteLength,
          // @ts-expect-error This is well supported
          // eslint-disable-next-line es-x/no-resizable-and-growable-arraybuffers
          { maxByteLength: MAX_BYTE_LENGTH },
        );
        const newView = new Float64Array(newBuffer);
        newView.set(this.view);
        this.sharedBuffer = newBuffer;
        this.view = newView;
      } else {
        console.log("GROW BUFFER");
        // Grow existing buffer
        // @ts-expect-error this is well supported
        // eslint-disable-next-line es-x/no-resizable-and-growable-arraybuffers, @typescript-eslint/no-unsafe-call
        this.sharedBuffer.grow(newByteLength);
        this.view = new Float64Array(this.sharedBuffer);
      }
    }
  }

  private getIndex(x: number, y: number): number {
    return (y * this.width + x) * this.itemLength;
  }

  private isValidActivePosition(x: number, y: number): boolean {
    return x >= 0 && x < this.activeWidth && y >= 0 && y < this.activeHeight;
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
    if (x >= this.activeWidth || y >= this.activeHeight) {
      throw new Error(
        `Set Position out of bounds: got, x "${x}", y "${y}". Needed: x < ${this.activeWidth}, y < ${this.activeHeight}`,
      );
    }
  }

  private validateDimensions(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      throw new Error(
        `Invalid dimensions: width and height must be positive. Got: width "${width}", height "${height}"`,
      );
    }
    if (width > this.maxWidth || height > this.maxHeight) {
      throw new Error(
        `Dimensions exceed maximum allowed: got width "${width}", height "${height}". Maximum: width ${this.maxWidth}, height ${this.maxHeight}`,
      );
    }
    const byteLength =
      width * height * this.itemLength * Float64Array.BYTES_PER_ELEMENT;
    if (byteLength > MAX_BYTE_LENGTH) {
      throw new Error(
        `Requested size exceeds maximum allowed byte length of ${MAX_BYTE_LENGTH}`,
      );
    }
  }
}
