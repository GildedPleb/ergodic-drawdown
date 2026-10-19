import { expect, test } from "bun:test";

import { decideSuiteRecord, isSlowMachine, wallLimitMs } from "../scripts/suite-record";

const record = { lineCoverage: 80, wallTimeMs: 200 };

test("SHITTY_COMPUTER counts when set to anything but empty or 0", () => {
  expect(isSlowMachine(undefined)).toBe(false);
  expect(isSlowMachine("")).toBe(false);
  expect(isSlowMachine("0")).toBe(false);
  expect(isSlowMachine("1")).toBe(true);
  expect(isSlowMachine("yes")).toBe(true);
});

test("a slow machine gets five times the wall limit", () => {
  expect(Math.round(wallLimitMs(200, false))).toBe(220);
  expect(Math.round(wallLimitMs(200, true))).toBe(1100);
  expect(decideSuiteRecord(record, { ...record, wallTimeMs: 1000 }, true, true).kind).toBe("keep");
  expect(decideSuiteRecord(record, { ...record, wallTimeMs: 1101 }, true, true).kind).toBe("fail");
  expect(decideSuiteRecord(record, { ...record, wallTimeMs: 1000 }, true, false).kind).toBe("fail");
});

test("a slow-machine run never rewrites the record", () => {
  expect(decideSuiteRecord(record, { lineCoverage: 90, wallTimeMs: 210 }, true, true)).toEqual({
    kind: "keep",
  });
  expect(decideSuiteRecord(record, { lineCoverage: 80, wallTimeMs: 100 }, true, true)).toEqual({
    kind: "keep",
  });
});
