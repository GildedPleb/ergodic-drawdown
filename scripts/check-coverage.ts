import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const suitePath = "test-suite.json";
const lcovPath = "coverage/lcov.info";

interface SuiteRecord {
  lineCoverage: number;
  wallTimeMs: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSuiteRecord = (value: unknown): value is SuiteRecord => {
  if (!isRecord(value)) return false;
  return typeof value["lineCoverage"] === "number" && typeof value["wallTimeMs"] === "number";
};

const start = performance.now();
// This file is the package script named test. A literal `bun test` spawn is that script, resolved from this directory.
const run = spawnSync(
  process.execPath,
  ["test", "--isolate", "--coverage", "--coverage-reporter=lcov", "--coverage-dir=coverage"],
  { stdio: "inherit" },
);
const wallTimeMs = Math.round(performance.now() - start);
if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

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
const next: SuiteRecord = { lineCoverage, wallTimeMs };

if (!existsSync(suitePath)) {
  writeFileSync(suitePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`wrote ${suitePath}: ${lineCoverage}% in ${wallTimeMs}ms`);
  process.exit(0);
}

const parsed: unknown = JSON.parse(readFileSync(suitePath, "utf8"));
if (!isSuiteRecord(parsed)) {
  throw new Error(`${suitePath} is not a suite record`);
}
const previous = parsed;
if (lineCoverage < previous.lineCoverage - 1) {
  throw new Error(
    `line coverage ${lineCoverage}% is more than 1 point under ${previous.lineCoverage}%`,
  );
}
if (lineCoverage > previous.lineCoverage) {
  writeFileSync(suitePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`raised ${suitePath} to ${lineCoverage}%`);
}
