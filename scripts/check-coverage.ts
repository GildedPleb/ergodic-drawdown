import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import {
  decideSuiteRecord,
  isSlowMachine,
  measuredWallTime,
  type SuiteRecord,
  wallLimitMs,
} from "./suite-record";

const suitePath = "test-suite.json";
const lcovPath = "coverage/lcov.info";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSuiteRecord = (value: unknown): value is SuiteRecord => {
  if (!isRecord(value)) return false;
  return typeof value["lineCoverage"] === "number" && typeof value["wallTimeMs"] === "number";
};

// SUITE_WALL=0 is CI. A GitHub runner does not hold the 10% clock. The hook sets SUITE_WALL=1.
const enforceWall = process.env["SUITE_WALL"] !== "0";
// SHITTY_COMPUTER gives the hook five times the wall limit and never writes the record.
const slowMachine = isSlowMachine(process.env["SHITTY_COMPUTER"]);

// This file is the package script named test. A literal `bun test` spawn is that script, resolved from this directory.
const timeSuite = (): { status: number; wallTimeMs: number } => {
  const start = performance.now();
  const run = spawnSync(
    process.execPath,
    ["test", "--isolate", "--coverage", "--coverage-reporter=lcov", "--coverage-dir=coverage"],
    { env: { ...process.env, SUITE: "1" }, stdio: "inherit" },
  );
  return { status: run.status ?? 1, wallTimeMs: Math.round(performance.now() - start) };
};

const first = timeSuite();
if (first.status !== 0) process.exit(first.status);

const report = readFileSync(lcovPath, "utf8");
let found = 0;
let hit = 0;
let skip = false;
for (const line of report.split("\n")) {
  if (line.startsWith("SF:")) {
    const file = line.slice(3);
    skip = file.includes("/test/") || file.startsWith("test/");
    continue;
  }
  if (line === "end_of_record") {
    skip = false;
    continue;
  }
  if (skip) continue;
  if (line.startsWith("LF:")) found += Number(line.slice(3));
  if (line.startsWith("LH:")) hit += Number(line.slice(3));
}
if (found === 0) {
  throw new Error("coverage report has no lines");
}

const lineCoverage = Math.round((hit / found) * 10_000) / 100;

if (!existsSync(suitePath)) {
  const created: SuiteRecord = { lineCoverage, wallTimeMs: first.wallTimeMs };
  writeFileSync(suitePath, `${JSON.stringify(created, null, 2)}\n`);
  console.log(`wrote ${suitePath}: ${lineCoverage}% in ${first.wallTimeMs}ms`);
  process.exit(0);
}

const parsed: unknown = JSON.parse(readFileSync(suitePath, "utf8"));
if (!isSuiteRecord(parsed)) {
  throw new Error(`${suitePath} is not a suite record`);
}

// A slow box retimes only a first sample over its own limit.
const retimeOverMs = slowMachine ? wallLimitMs(parsed.wallTimeMs, true) : parsed.wallTimeMs;
let secondMs: number | undefined;
if (enforceWall && first.wallTimeMs > retimeOverMs) {
  const second = timeSuite();
  if (second.status !== 0) process.exit(second.status);
  secondMs = second.wallTimeMs;
}
const wallTimeMs = measuredWallTime(retimeOverMs, first.wallTimeMs, secondMs);
const decision = decideSuiteRecord(parsed, { lineCoverage, wallTimeMs }, enforceWall, slowMachine);
if (decision.kind === "fail") throw new Error(decision.reason);
if (decision.kind === "write") {
  writeFileSync(suitePath, `${JSON.stringify(decision.record, null, 2)}\n`);
}
const sampleNote =
  secondMs === undefined ? "" : ` (faster of ${first.wallTimeMs}ms and ${secondMs}ms)`;
const slowNote = slowMachine
  ? ` (SHITTY_COMPUTER: limit ${Math.round(wallLimitMs(parsed.wallTimeMs, true))}ms, record not written)`
  : "";
const wallNote = enforceWall ? `${sampleNote}${slowNote}` : " (wall budget not enforced)";
console.log(`${lineCoverage}% in ${wallTimeMs}ms${wallNote}`);
