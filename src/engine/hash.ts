import { type Point } from "chart.js";
import hashSum from "hash-sum";

import GrowableSharedArray from "../classes/growable-shared-array";
import { type Dataset } from "../types";

export const dependencyObjectSymbol = Symbol("dependency");

export interface DependencyView {
  currentHash: string;
  [dependencyObjectSymbol]: true;
  lastComputed: string;
  name: string;
}

const isDependencyObject = (dep: unknown): dep is DependencyView =>
  Boolean(dep) && typeof dep === "object" && dep !== null && dependencyObjectSymbol in dep;

const isPoint = (point: unknown): point is Point =>
  typeof point === "object" &&
  point !== null &&
  "x" in point &&
  typeof point.x === "number" &&
  "y" in point &&
  typeof point.y === "number";

const isDataset = (object: unknown): object is Dataset =>
  typeof object === "object" &&
  object !== null &&
  "data" in object &&
  Array.isArray(object.data) &&
  isPoint(object.data[0]) &&
  "label" in object &&
  typeof object.label === "string" &&
  "pointRadius" in object &&
  typeof object.pointRadius === "number" &&
  "tension" in object &&
  typeof object.tension === "number";

const isDatasetOrDatasetList = (object: unknown): boolean => {
  if (Array.isArray(object)) {
    if (object.length > 0 && isDataset(object[0])) return true;
  } else if (typeof object === "object" && object !== null && isDataset(object)) {
    return true;
  }
  return false;
};

// Buffers hash as their type name. Dependents wake from the upstream node hash,
// and the handler reads the bytes already written into the object it holds.
export const fastCustomHashSum = (dependencies: readonly unknown[]): string => {
  const length = dependencies.length;
  const parts: string[] = Array.from({ length });
  for (let index = 0; index < length; index++) {
    const dep = dependencies[index];

    if (dep instanceof GrowableSharedArray) {
      parts[index] = "GrowableSharedArray";
    } else if (dep instanceof Float64Array) {
      parts[index] = "Float64Array";
    } else if (Array.isArray(dep) && dep.some((item) => item instanceof Float64Array)) {
      parts[index] = "Float64Array[]";
    } else if (dep instanceof Map) {
      parts[index] = "Map";
    } else if (isDependencyObject(dep)) {
      parts[index] = dep.currentHash;
    } else if (typeof dep === "function") {
      parts[index] = "function";
    } else if (typeof dep === "object" && dep !== null) {
      if (isDatasetOrDatasetList(dep)) {
        parts[index] = "Dataset";
      } else {
        const objectParts: string[] = [];
        for (const [key, value] of Object.entries(dep)) {
          if (value instanceof Float64Array) {
            objectParts.push(`${key}:Float64Array`);
          } else if (typeof value === "object" && value !== null) {
            objectParts.push(`${key}:${hashSum(value)}`);
          } else {
            objectParts.push(`${key}:${String(value)}`);
          }
        }
        parts[index] = objectParts.join(",");
      }
    } else {
      parts[index] = String(dep);
    }
  }

  return hashSum(parts.join("|"));
};
