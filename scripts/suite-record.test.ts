import { expect, test } from "bun:test";

import { decideSuiteRecord, measuredWallTime, type SuiteRecord } from "./suite-record";

const previous: SuiteRecord = { lineCoverage: 71.26, wallTimeMs: 239 };

test("a faster run leaves the wall budget alone", () => {
  expect(decideSuiteRecord(previous, { lineCoverage: 71.26, wallTimeMs: 220 })).toEqual({
    kind: "keep",
  });
});

test("a slower run inside 10% raises the wall budget to that time", () => {
  const budget: SuiteRecord = { lineCoverage: 71.26, wallTimeMs: 200 };

  expect(decideSuiteRecord(budget, { lineCoverage: 71.26, wallTimeMs: 218 })).toEqual({
    kind: "write",
    record: { lineCoverage: 71.26, wallTimeMs: 218 },
  });
  expect(decideSuiteRecord(previous, { lineCoverage: 71.26, wallTimeMs: 262 })).toEqual({
    kind: "write",
    record: { lineCoverage: 71.26, wallTimeMs: 262 },
  });
});

test("a run more than 10% over the wall budget fails and does not raise it", () => {
  const decision = decideSuiteRecord(previous, { lineCoverage: 71.26, wallTimeMs: 263 });

  expect(decision.kind).toBe("fail");
  if (decision.kind === "fail") {
    expect(decision.reason).toBe("wall time 263ms is more than 10% over 239ms");
  }
});

test("a coverage drop of more than one point fails before the wall budget", () => {
  const decision = decideSuiteRecord(previous, { lineCoverage: 70.2, wallTimeMs: 100 });

  expect(decision).toEqual({
    kind: "fail",
    reason: "line coverage 70.2% is more than 1 point under 71.26%",
  });
});

test("a higher coverage floor keeps the existing wall budget", () => {
  expect(decideSuiteRecord(previous, { lineCoverage: 72, wallTimeMs: 200 })).toEqual({
    kind: "write",
    record: { lineCoverage: 72, wallTimeMs: 239 },
  });
});

test("a higher coverage floor and a slower legal run raise both", () => {
  const budget: SuiteRecord = { lineCoverage: 71.26, wallTimeMs: 200 };

  expect(decideSuiteRecord(budget, { lineCoverage: 72, wallTimeMs: 218 })).toEqual({
    kind: "write",
    record: { lineCoverage: 72, wallTimeMs: 218 },
  });
});

test("a higher coverage floor does not get written when the wall budget fails", () => {
  const decision = decideSuiteRecord(previous, { lineCoverage: 80, wallTimeMs: 500 });

  expect(decision.kind).toBe("fail");
});

test("a slow run with the wall budget off keeps the record", () => {
  expect(decideSuiteRecord(previous, { lineCoverage: 71.26, wallTimeMs: 900 }, false)).toEqual({
    kind: "keep",
  });
});

test("a higher coverage floor with the wall budget off keeps the existing wall budget", () => {
  expect(decideSuiteRecord(previous, { lineCoverage: 72, wallTimeMs: 900 }, false)).toEqual({
    kind: "write",
    record: { lineCoverage: 72, wallTimeMs: 239 },
  });
});

test("a slow sample confirmed under the budget leaves the budget", () => {
  const budget: SuiteRecord = { lineCoverage: 71.26, wallTimeMs: 270 };
  const wallTimeMs = measuredWallTime(budget.wallTimeMs, 303, 249);

  expect(decideSuiteRecord(budget, { lineCoverage: 71.26, wallTimeMs })).toEqual({ kind: "keep" });
});

test("a slow sample confirmed at a legal increase raises the budget to that time", () => {
  const budget: SuiteRecord = { lineCoverage: 71.26, wallTimeMs: 200 };
  const wallTimeMs = measuredWallTime(budget.wallTimeMs, 230, 218);

  expect(decideSuiteRecord(budget, { lineCoverage: 71.26, wallTimeMs })).toEqual({
    kind: "write",
    record: { lineCoverage: 71.26, wallTimeMs: 218 },
  });
});

test("two samples over 10% still fail", () => {
  const budget: SuiteRecord = { lineCoverage: 71.26, wallTimeMs: 270 };
  const wallTimeMs = measuredWallTime(budget.wallTimeMs, 303, 310);

  expect(decideSuiteRecord(budget, { lineCoverage: 71.26, wallTimeMs }).kind).toBe("fail");
});

test("a coverage drop with the wall budget off still fails", () => {
  expect(decideSuiteRecord(previous, { lineCoverage: 70.2, wallTimeMs: 100 }, false)).toEqual({
    kind: "fail",
    reason: "line coverage 70.2% is more than 1 point under 71.26%",
  });
});
