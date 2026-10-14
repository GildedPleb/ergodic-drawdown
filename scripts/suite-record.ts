export interface SuiteRecord {
  lineCoverage: number;
  wallTimeMs: number;
}

const COVERAGE_DROP_POINTS = 1;
const WALL_TIME_LIMIT = 1.1;

export type SuiteDecision =
  | { kind: "fail"; reason: string }
  | { kind: "keep" }
  | { kind: "write"; record: SuiteRecord };

export const decideSuiteRecord = (previous: SuiteRecord, measured: SuiteRecord): SuiteDecision => {
  if (measured.lineCoverage < previous.lineCoverage - COVERAGE_DROP_POINTS) {
    return {
      kind: "fail",
      reason: `line coverage ${measured.lineCoverage}% is more than 1 point under ${previous.lineCoverage}%`,
    };
  }
  if (measured.wallTimeMs > previous.wallTimeMs * WALL_TIME_LIMIT) {
    return {
      kind: "fail",
      reason: `wall time ${measured.wallTimeMs}ms is more than 10% over ${previous.wallTimeMs}ms`,
    };
  }
  const lineCoverage = Math.max(previous.lineCoverage, measured.lineCoverage);
  if (lineCoverage === previous.lineCoverage) return { kind: "keep" };
  return { kind: "write", record: { lineCoverage, wallTimeMs: previous.wallTimeMs } };
};
