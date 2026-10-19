export interface SuiteRecord {
  lineCoverage: number;
  wallTimeMs: number;
}

const COVERAGE_DROP_POINTS = 1;
const WALL_TIME_LIMIT = 1.1;
const SLOW_MACHINE_FACTOR = 5;

// SHITTY_COMPUTER set to anything but empty or 0 marks a slow box.
export const isSlowMachine = (value: string | undefined): boolean =>
  value !== undefined && value !== "" && value !== "0";

// A slow box gets five times the 10% line, and its runs never move the record.
export const wallLimitMs = (budgetMs: number, slowMachine: boolean): number =>
  budgetMs * WALL_TIME_LIMIT * (slowMachine ? SLOW_MACHINE_FACTOR : 1);

export type SuiteDecision =
  | { kind: "fail"; reason: string }
  | { kind: "keep" }
  | { kind: "write"; record: SuiteRecord };

export const decideSuiteRecord = (
  previous: SuiteRecord,
  measured: SuiteRecord,
  enforceWall = true,
  slowMachine = false,
): SuiteDecision => {
  if (measured.lineCoverage < previous.lineCoverage - COVERAGE_DROP_POINTS) {
    return {
      kind: "fail",
      reason: `line coverage ${measured.lineCoverage}% is more than 1 point under ${previous.lineCoverage}%`,
    };
  }
  if (enforceWall && measured.wallTimeMs > wallLimitMs(previous.wallTimeMs, slowMachine)) {
    const line = slowMachine
      ? `the SHITTY_COMPUTER limit of ${Math.round(wallLimitMs(previous.wallTimeMs, true))}ms (5x of 10% over ${previous.wallTimeMs}ms)`
      : `10% over ${previous.wallTimeMs}ms`;
    return { kind: "fail", reason: `wall time ${measured.wallTimeMs}ms is more than ${line}` };
  }
  if (slowMachine) return { kind: "keep" };
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
