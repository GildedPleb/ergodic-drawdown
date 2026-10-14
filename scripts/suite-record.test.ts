import { expect, test } from "bun:test";

import { decideSuiteRecord, type SuiteRecord } from "./suite-record";

const previous: SuiteRecord = { lineCoverage: 71.26, wallTimeMs: 239 };

test("a run inside the wall budget leaves the suite record alone", () => {
  expect(decideSuiteRecord(previous, { lineCoverage: 71.26, wallTimeMs: 220 })).toEqual({
    kind: "keep",
  });
  expect(decideSuiteRecord(previous, { lineCoverage: 71.26, wallTimeMs: 262 })).toEqual({
    kind: "keep",
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

test("a higher coverage floor does not get written when the wall budget fails", () => {
  const decision = decideSuiteRecord(previous, { lineCoverage: 80, wallTimeMs: 500 });

  expect(decision.kind).toBe("fail");
});
