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

export const decideSuiteRecord = (
  previous: SuiteRecord,
  measured: SuiteRecord,
  enforceWall = true,
): SuiteDecision => {
  if (measured.lineCoverage < previous.lineCoverage - COVERAGE_DROP_POINTS) {
    return {
      kind: "fail",
      reason: `line coverage ${measured.lineCoverage}% is more than 1 point under ${previous.lineCoverage}%`,
    };
  }
  if (enforceWall && measured.wallTimeMs > previous.wallTimeMs * WALL_TIME_LIMIT) {
    return {
      kind: "fail",
      reason: `wall time ${measured.wallTimeMs}ms is more than 10% over ${previous.wallTimeMs}ms`,
    };
  }
  const lineCoverage = Math.max(previous.lineCoverage, measured.lineCoverage);
  const wallTimeMs =
    enforceWall && measured.wallTimeMs > previous.wallTimeMs
      ? measured.wallTimeMs
      : previous.wallTimeMs;
  if (lineCoverage === previous.lineCoverage && wallTimeMs === previous.wallTimeMs) {
    return { kind: "keep" };
  }
  return { kind: "write", record: { lineCoverage, wallTimeMs } };
};

// A single slow sample of this suite moves by more than 10%. The faster of the two counts.
export const measuredWallTime = (
  budgetMs: number,
  firstMs: number,
  secondMs: number | undefined,
): number => {
  if (secondMs === undefined || firstMs <= budgetMs) return firstMs;
  return Math.min(firstMs, secondMs);
};
