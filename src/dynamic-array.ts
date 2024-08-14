// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { WEEKS_PER_EPOCH } from "./constants";

export default class Dynamic2DArray {
  private data: Float64Array[];

  private boxWidth: number;

  private boxHeight: number;

  private activeWidth: number;

  private activeHeight: number;

  private readonly multiplier: number;

  private readonly minHeight: number;

  private readonly minWidth: number;

  private readonly space: number;

  constructor(
    initialActiveWidth: number,
    initialActiveHeight: number,
    multiplier = WEEKS_PER_EPOCH,
    minWidth = 10,
    minHeight = 1000,
    space = 2,
  ) {
    if (space * initialActiveWidth < minWidth) {
      throw new Error(
        `Initial Width Less Than default minimum box width: ${minWidth} ${minHeight}`,
      );
    }
    if (space * initialActiveHeight < minHeight) {
      throw new Error("Initial height Less Than default minimum box height");
    }

    this.activeWidth = initialActiveWidth;
    this.activeHeight = initialActiveHeight;
    this.boxWidth = Math.floor(space * initialActiveWidth);
    this.boxHeight = Math.floor(space * initialActiveHeight);
    this.data = Array.from({ length: this.boxHeight });
    this.multiplier = multiplier;
    this.minHeight = minHeight;
    this.minWidth = minWidth;
    this.space = space;

    for (let index = 0; index < this.boxHeight; index++) {
      this.data[index] = new Float64Array(this.boxWidth * this.multiplier);
    }
  }

  // eslint-disable-next-line functional/functional-parameters
  peak(): void {
    console.log({
      activeHeight: this.activeHeight,
      activeWidth: this.activeWidth,
      boxHeight: this.boxHeight,
      boxWidth: this.boxWidth,
      data: this.data,
    });
  }

  get(x: number, y: number): Float64Array | undefined {
    if (x < 0 || x >= this.activeWidth || y < 0 || y >= this.activeHeight) {
      return undefined;
    }

    const start = x * this.multiplier;
    const end = (x + 1) * this.multiplier;
    const rowData = this.data[y];

    for (let index = start; index < end; index++) {
      if (rowData[index] !== 0) {
        return rowData.subarray(start, end);
      }
    }
    return undefined;
  }

  getRow(y: number): Float64Array | undefined {
    if (y < 0 || y >= this.activeHeight) return undefined;
    const row = this.data[y];
    const start = (this.activeWidth - 1) * this.multiplier;
    const end = this.activeWidth * this.multiplier;
    for (let index = start; index < end; index++) {
      if (row[index] !== 0) {
        break;
      }
      if (index === end - 1) {
        return undefined;
      }
    }
    return row.subarray(0, end);
  }

  resizeActive(newActiveWidth: number, newActiveHeight: number): void {
    this.activeWidth = newActiveWidth;
    this.activeHeight = newActiveHeight;

    if (newActiveWidth >= this.boxWidth) {
      const newWidth = Math.floor(newActiveWidth * this.space);
      for (let index = 0; index < this.boxHeight; index++) {
        const extendedRow = new Float64Array(
          Math.floor(newWidth * this.multiplier),
        );
        extendedRow.set(this.data[index]);
        this.data[index] = extendedRow;
      }
      this.boxWidth = newWidth;
    }

    if (newActiveHeight >= this.boxHeight) {
      const newHeight = Math.floor(newActiveHeight * this.space);
      for (let index = this.boxHeight; index < newHeight; index++) {
        this.data[index] = new Float64Array(
          Math.floor(this.boxWidth * this.multiplier),
        );
      }
      this.boxHeight = newHeight;
    }

    if (newActiveWidth < this.boxWidth / this.space) {
      const newWidth =
        this.activeWidth * this.space < this.minWidth
          ? this.minWidth
          : Math.floor(this.activeWidth * this.space);

      for (let index = 0; index < this.boxHeight; index++) {
        this.data[index] = this.data[index].subarray(
          0,
          Math.floor(newWidth * this.multiplier),
        );
      }
      this.boxWidth = newWidth;
    }

    if (newActiveHeight < this.boxHeight / this.space) {
      const newHeight =
        this.activeHeight * this.space < this.minHeight
          ? this.minHeight
          : Math.floor(this.activeHeight * this.space);

      this.data = this.data.slice(0, newHeight);
      this.boxHeight = newHeight;
    }
  }

  set(x: number, y: number, value: Float64Array): void {
    if (x < 0 || y < 0 || value.length !== this.multiplier) {
      throw new Error(
        `Invalid parameters: Ensure that x, y are non-negative and value has length equal to ${this.multiplier}. Got: x "${x}", y "${y}", length "${value.length}"`,
      );
    }
    if (x >= this.activeWidth || y >= this.activeHeight) {
      throw new Error(
        `Set Position out of bounds: got, x "${x}", y "${y}". Needed: x < ${this.activeWidth}, y < ${this.activeHeight}`,
      );
    }
    this.data[y].set(value, Math.floor(x * this.multiplier));
  }
}
