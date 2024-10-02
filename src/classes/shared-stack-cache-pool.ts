/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable functional/functional-parameters */
/* eslint-disable security/detect-object-injection */
import SharedStackCache from "./shared-stack-cache";

export default class SharedArrayPool {
  private arrays: SharedStackCache[] = [];

  private readonly itemLength: number;

  private readonly maxHeight: number = 1000;

  private currentWidth: number;

  private currentHeight: number;

  private cacheHash: string;

  private cacheHeight: number;

  private cacheWidth: number;

  constructor(initialWidth: number, initialHeight: number, itemLength: number) {
    this.itemLength = itemLength;
    this.currentWidth = initialWidth;
    this.currentHeight = 0;
    this.resizeHeight(initialHeight);
    this.cacheHash = "init";
    this.cacheHeight = 0;
    this.cacheWidth = 0;
  }

  customHashValue(): string {
    return JSON.stringify({
      cacheHash: this.cacheHash,
      cacheHeight: this.cacheHeight,
      cacheWidth: this.cacheWidth,
      currentHeight: this.currentHeight,
      currentWidth: this.currentWidth,
      itemLength: this.itemLength,
    });
  }

  getValidity(currentHash: string): [validWidth: number, validHeight: number] {
    if (currentHash === this.cacheHash)
      return [this.cacheWidth, this.cacheHeight];
    return [0, 0];
  }

  setValidity(currentHash: string): void {
    // this.cacheHash = currentHash;
    // this.cacheHeight = Math.max(this.currentHeight, this.cacheHeight);
    // this.cacheWidth = Math.max(this.currentWidth, this.cacheWidth);

    if (this.cacheHash === currentHash) {
      this.cacheHeight = Math.max(this.currentHeight, this.cacheHeight);
      this.cacheWidth = Math.max(this.currentWidth, this.cacheWidth);
    } else {
      this.cacheHash = currentHash;
      this.cacheHeight = this.currentHeight;
      this.cacheWidth = this.currentWidth;
    }
  }

  clear(): void {
    for (const array of this.arrays) {
      array.clear();
    }
    this.cacheHeight = this.currentHeight;
    this.cacheWidth = this.currentWidth;
  }

  resizeHeight(newHeight: number): void {
    const requiredArrays = Math.max(1, Math.ceil(newHeight / this.maxHeight));

    if (
      requiredArrays === this.arrays.length &&
      newHeight === this.currentHeight
    )
      return;
    if (requiredArrays > this.arrays.length) {
      while (this.arrays.length < requiredArrays) {
        this.arrays.push(this.createNewArray());
      }
    } else if (requiredArrays < this.arrays.length) {
      this.arrays = this.arrays.slice(0, requiredArrays);
      this.cacheHeight = this.arrays.length * this.maxHeight;
    }

    this.currentHeight = newHeight;
  }

  resizeWidth(newWidth: number): void {
    if (newWidth === this.currentWidth) return;
    for (const array of this.arrays) {
      array.resizeWidth(newWidth);
    }
    this.currentWidth = newWidth;
  }

  get(x: number, y: number): Float64Array | undefined {
    if (x >= this.currentWidth || y >= this.currentHeight) return undefined;

    const arrayIndex = Math.floor(y / this.maxHeight);
    const localY = y % this.maxHeight;
    return this.arrays[arrayIndex].get(x, localY);
  }

  getRow(y: number, getZero = false): Float64Array | undefined {
    if (y >= this.currentHeight) return undefined;
    const arrayIndex = Math.floor(y / this.maxHeight);
    const localY = y % this.maxHeight;
    return this.arrays[arrayIndex].getRow(localY, getZero);
  }

  coalesce(lastHalving: number, getZero = false): Float64Array[] {
    const result: Float64Array[] = [];

    for (let y = 0; y < this.currentHeight; y++) {
      const row = new Float64Array(this.currentWidth * this.itemLength);
      const newRow = this.getRow(y, getZero);
      if (newRow === undefined) continue;
      row.set(newRow);
      result.push(row.subarray(lastHalving));
    }

    return result;
  }

  set(x: number, y: number, value: Float64Array): void {
    if (x >= this.currentWidth || y >= this.currentHeight) {
      throw new Error(
        `Set position out of bounds: (${x}, ${y}) exceeds current dimensions (${this.currentWidth}, ${this.currentHeight})`,
      );
    }

    const arrayIndex = Math.floor(y / this.maxHeight);
    const localY = y % this.maxHeight;
    this.arrays[arrayIndex].set(x, localY, value);
  }

  getArrays(): SharedStackCache[] {
    return this.arrays;
  }

  getWidth(): number {
    return this.currentWidth;
  }

  getHeight(): number {
    return this.currentHeight;
  }

  private createNewArray(): SharedStackCache {
    const bufferSize = this.maxHeight * 6240 * Float64Array.BYTES_PER_ELEMENT;
    const sharedBuffer = new SharedArrayBuffer(bufferSize);
    return new SharedStackCache(
      sharedBuffer,
      this.currentWidth,
      this.itemLength,
    );
  }
}
