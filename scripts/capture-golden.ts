import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { measuredMarkdown, type BenchFile, type RuntimeMeasure } from "./golden/report";

const BENCH_PATH = "golden/bench.json";
const MEASURED_PATH = "golden/MEASURED.md";
const NODE_BUNDLE = "/tmp/ergodic-golden-run.mjs";
const CAPTURE_BUNDLE = "/tmp/ergodic-golden-capture.mjs";
const PROTOCOL =
  "3 warmups, median of 15. Kernels are one thread, 1000 samples × 10 epochs, volatility 0.1, seed 1.";
const GRID_KINDS = ["price", "walk", "balance"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readNumber = (record: Record<string, unknown>, key: string): number => {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`golden result missing ${key}`);
  }
  return value;
};

const readMeasure = (value: unknown): RuntimeMeasure => {
  if (!isRecord(value)) throw new Error("golden result is not an object");
  return {
    bubbleLastPrice: readNumber(value, "bubbleLastPrice"),
    hashDefaultChangeMs: readNumber(value, "hashDefaultChangeMs"),
    hashWideChangeMs: readNumber(value, "hashWideChangeMs"),
    quantileMs: readNumber(value, "quantileMs"),
    quantileSum: readNumber(value, "quantileSum"),
    sharkLastPrice: readNumber(value, "sharkLastPrice"),
    simulationBubbleMs: readNumber(value, "simulationBubbleMs"),
    simulationSharkMs: readNumber(value, "simulationSharkMs"),
  };
};

const readPayload = (stdout: string): { measure: RuntimeMeasure; runtime: "bun" | "node" } => {
  const line = stdout.split("\n").find((entry) => entry.startsWith("GOLDEN_RESULT "));
  if (line === undefined) throw new Error("golden run printed no GOLDEN_RESULT");
  const parsed: unknown = JSON.parse(line.slice("GOLDEN_RESULT ".length));
  if (!isRecord(parsed)) throw new Error("golden result is not an object");
  const runtime = parsed["runtime"];
  if (runtime !== "bun" && runtime !== "node") throw new Error("golden result has no runtime");
  return { measure: readMeasure(parsed["result"]), runtime };
};

const readBench = (): BenchFile => {
  try {
    const parsed: unknown = JSON.parse(readFileSync(BENCH_PATH, "utf8"));
    if (!isRecord(parsed) || !isRecord(parsed["runs"])) {
      return { protocol: PROTOCOL, runs: {} };
    }
    const runs: BenchFile["runs"] = {};
    for (const runtime of ["bun", "node"] as const) {
      const stored = parsed["runs"][runtime];
      if (stored === undefined) continue;
      runs[runtime] = readMeasure(stored);
    }
    return { protocol: PROTOCOL, runs };
  } catch (error) {
    if (isRecord(error) && error["code"] === "ENOENT") return { protocol: PROTOCOL, runs: {} };
    throw error;
  }
};

const spawnEnv = (): NodeJS.ProcessEnv => ({ ...process.env, TZ: "UTC" });

const runCaptured = (
  command: string,
  args: readonly string[],
  label: string,
  verb: string,
): string => {
  console.error(`${verb} on ${label}.`);
  const run = spawnSync(command, [...args], {
    encoding: "utf8",
    env: spawnEnv(),
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (run.status !== 0) {
    const tail = run.stdout.slice(-2000);
    if (tail.length > 0) process.stdout.write(tail);
    throw new Error(`${label} ${verb.toLowerCase()} exited ${run.status ?? "unknown"}`);
  }
  return run.stdout;
};

const captureLine = (stdout: string): string => {
  const line = stdout.split("\n").find((entry) => entry.startsWith("GOLDEN_CAPTURE "));
  if (line === undefined) throw new Error("capture printed no GOLDEN_CAPTURE");
  return line.slice("GOLDEN_CAPTURE ".length);
};

const firstDifference = (left: string, right: string): string => {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) index += 1;
  const slice = (value: string): string => JSON.stringify(value.slice(index, index + 80));
  return `at ${index}: ${slice(left)} vs ${slice(right)}`;
};

const assertSameCapture = (left: string, right: string, label: string): void => {
  if (left === right) return;
  throw new Error(`${label} captures differ ${firstDifference(left, right)}`);
};

interface WrittenGrid {
  bytes: Buffer;
  name: string;
}

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error(`${label} is not an object`);
  return value;
};

const stripCapture = (
  line: string,
): { files: WrittenGrid[]; manifest: Record<string, unknown> } => {
  const parsed: unknown = JSON.parse(line);
  const cloned: unknown = JSON.parse(line);
  const manifest = asRecord(cloned, "capture");
  if (JSON.stringify(parsed) !== line) {
    throw new Error("capture JSON did not round-trip");
  }
  const cases = manifest["cases"];
  if (!Array.isArray(cases)) throw new Error("capture has no cases");
  const files: WrittenGrid[] = [];
  for (const item of cases) {
    const record = asRecord(item, "case");
    const name = record["name"];
    if (typeof name !== "string" || !/^[a-z0-9-]+$/.test(name)) {
      throw new Error(`unsafe golden case name ${String(name)}`);
    }
    const grids = asRecord(record["grids"], `${name} grids`);
    for (const kind of GRID_KINDS) {
      const grid = asRecord(grids[kind], `${name} ${kind}`);
      const encoded = grid["f64"];
      if (encoded === undefined) continue;
      if (typeof encoded !== "string") throw new Error(`${name} ${kind} f64 is not a string`);
      delete grid["f64"];
      const fileName = `${name}.${kind}.f64`;
      grid["bytes"] = fileName;
      files.push({ bytes: Buffer.from(encoded, "base64"), name: fileName });
    }
  }
  return { files, manifest };
};

const manifestPath = (runtime: "bun" | "node"): string => join("golden", runtime, "manifest.json");

const writeManifest = (runtime: "bun" | "node", line: string): void => {
  const { files, manifest } = stripCapture(line);
  if (manifest["runtime"] !== runtime) {
    throw new Error(`${runtime} capture reported ${String(manifest["runtime"])}`);
  }
  const directory = join("golden", runtime);
  rmSync(directory, { force: true, recursive: true });
  mkdirSync(directory, { recursive: true });
  for (const file of files) writeFileSync(join(directory, file.name), file.bytes);
  writeFileSync(manifestPath(runtime), `${JSON.stringify(manifest, null, 2)}\n`);
  console.error(`Wrote golden/${runtime} (${files.length} grid files).`);
};

const checkManifest = (runtime: "bun" | "node", line: string): void => {
  const { files, manifest } = stripCapture(line);
  if (manifest["runtime"] !== runtime) {
    throw new Error(`${runtime} capture reported ${String(manifest["runtime"])}`);
  }
  const directory = join("golden", runtime);
  const stored = readFileSync(manifestPath(runtime), "utf8");
  const fresh = `${JSON.stringify(manifest, null, 2)}\n`;
  if (stored !== fresh) {
    throw new Error(`golden/${runtime}/manifest.json differs ${firstDifference(stored, fresh)}`);
  }
  for (const file of files) {
    const onDisk = readFileSync(join(directory, file.name));
    if (!onDisk.equals(file.bytes)) throw new Error(`golden/${runtime}/${file.name} differs`);
  }
  console.error(`golden/${runtime} matches (${files.length} grid files).`);
};

const bundleCapture = (): void => {
  const built = spawnSync(
    process.execPath,
    ["build", "./test/golden/capture-run.ts", "--target", "node", `--outfile=${CAPTURE_BUNDLE}`],
    { stdio: "inherit" },
  );
  if (built.status !== 0) throw new Error("bundling the Node capture failed");
};

const captureRuntime = (runtime: "bun" | "node"): string => {
  if (runtime === "bun") {
    return captureLine(
      runCaptured(process.execPath, ["./test/golden/capture-run.ts"], "Bun", "Capturing"),
    );
  }
  return captureLine(runCaptured("node", [CAPTURE_BUNDLE], "Node", "Capturing"));
};

const writeReport = (bench: BenchFile, print: boolean): void => {
  mkdirSync("golden", { recursive: true });
  writeFileSync(BENCH_PATH, `${JSON.stringify(bench, null, 2)}\n`);
  const markdown = measuredMarkdown(bench);
  writeFileSync(MEASURED_PATH, markdown);
  if (print) process.stdout.write(markdown);
};

const measure = (): void => {
  const bench = readBench();
  const bunStdout = runCaptured(process.execPath, ["./test/golden/run.ts"], "Bun", "Measuring");
  const bun = readPayload(bunStdout);
  bench.runs[bun.runtime] = bun.measure;
  bench.protocol = PROTOCOL;
  writeReport(bench, false);

  try {
    const built = spawnSync(
      process.execPath,
      ["build", "./test/golden/run.ts", "--target", "node", `--outfile=${NODE_BUNDLE}`],
      { stdio: "inherit" },
    );
    if (built.status !== 0) throw new Error("bundling the Node measurement failed");
    const nodeStdout = runCaptured("node", [NODE_BUNDLE], "Node", "Measuring");
    const node = readPayload(nodeStdout);
    bench.runs[node.runtime] = node.measure;
  } catch (error) {
    writeReport(bench, true);
    throw error;
  }
  writeReport(bench, true);
};

const main = (): void => {
  const update = process.argv.includes("--update");
  const check = process.argv.includes("--check");
  if (update && check) throw new Error("pass only one of --update or --check");
  const only = process.env["GOLDEN_ONLY"];
  if ((update || check) && only !== undefined && only !== "") {
    throw new Error("unset GOLDEN_ONLY before --update or --check");
  }

  try {
    if (!check && (only === undefined || only === "")) measure();
    if (check) {
      bundleCapture();
      checkManifest("bun", captureRuntime("bun"));
      checkManifest("node", captureRuntime("node"));
      console.error("Fixtures match the committed manifests.");
      return;
    }

    const bunFirst = captureRuntime("bun");
    const bunSecond = captureRuntime("bun");
    assertSameCapture(bunFirst, bunSecond, "Bun");
    bundleCapture();
    const nodeFirst = captureRuntime("node");
    const nodeSecond = captureRuntime("node");
    assertSameCapture(nodeFirst, nodeSecond, "Node");
    if (update) {
      writeManifest("bun", bunFirst);
      writeManifest("node", nodeFirst);
      console.error("Fixtures written. Two captures matched on each runtime.");
      return;
    }
    console.error("Two captures matched on each runtime. Pass --update to write them.");
  } finally {
    rmSync(NODE_BUNDLE, { force: true });
    rmSync(CAPTURE_BUNDLE, { force: true });
  }
};

main();
