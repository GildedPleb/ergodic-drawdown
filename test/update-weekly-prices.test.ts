import { afterEach, expect, test } from "bun:test";

declare const process: {
  execPath: string;
  env: Record<string, string | undefined>;
};

declare const Bun: {
  file(path: string): { text(): Promise<string> };
  spawnSync(options: {
    cmd: string[];
    env: Record<string, string>;
    stderr: "pipe";
    stdout: "pipe";
  }): { exitCode: number; stderr: Uint8Array; stdout: Uint8Array };
  write(path: string, data: string): Promise<number>;
};

const saturday = (iso: string): number => Math.floor(Date.parse(iso) / 1000);

const oct3 = saturday("2026-10-03T00:00:00.000Z");
const oct10 = saturday("2026-10-10T00:00:00.000Z");
const tuesday = saturday("2026-10-13T15:00:00.000Z");
const saturdayAfternoon = saturday("2026-10-10T15:00:00.000Z");
const sunday = saturday("2026-10-11T01:00:00.000Z");

const decode = new TextDecoder();

const series = (times: number[]): string => {
  const points = times.map((time) => `  {\n    "x": ${time * 1000},\n    "y": 1\n  }`);
  return `[\n${points.join(",\n")}\n]\n`;
};

const candle = (time: number, close: number): number[] => [time, 1, 1, 1, close, 1];

let directory: string | undefined;

afterEach(() => {
  if (directory !== undefined) {
    Bun.spawnSync({ cmd: ["rm", "-rf", directory], env: {}, stderr: "pipe", stdout: "pipe" });
  }
  directory = undefined;
});

const run = async (
  body: string,
  env: Record<string, string>,
): Promise<{ status: number; stderr: string; stdout: string; text: string }> => {
  directory = `/tmp/weekly-prices-${crypto.randomUUID()}`;
  const path = `${directory}/weeks.json`;
  await Bun.write(path, body);
  const inherited: Record<string, string> = {};
  for (const key of Object.keys(process.env)) {
    const value = process.env[key];
    if (value !== undefined) inherited[key] = value;
  }
  const result = Bun.spawnSync({
    cmd: [process.execPath, "scripts/update-weekly-prices.ts"],
    env: { ...inherited, WEEKLY_FILE: path, ...env },
    stderr: "pipe",
    stdout: "pipe",
  });
  return {
    status: result.exitCode,
    stderr: decode.decode(result.stderr),
    stdout: decode.decode(result.stdout),
    text: await Bun.file(path).text(),
  };
};

test("a finished week is left in place", async () => {
  const body = series([oct10]);
  const result = await run(body, {
    WEEKLY_CANDLES: JSON.stringify([candle(oct10, 80_000)]),
    WEEKLY_NOW: String(tuesday),
  });

  expect(result.status).toBe(0);
  expect(result.stdout.includes("weekly prices current through 2026-10-10")).toBe(true);
  expect(result.text).toBe(body);
});

test("an unfinished Saturday stays out of the file", async () => {
  const body = series([oct3]);
  const result = await run(body, {
    WEEKLY_CANDLES: JSON.stringify([candle(oct10, 83_000)]),
    WEEKLY_NOW: String(saturdayAfternoon),
  });

  expect(result.status).toBe(0);
  expect(result.stdout.includes("weekly prices current through 2026-10-03")).toBe(true);
  expect(result.text).toBe(body);
});

test("a completed Saturday is appended", async () => {
  const result = await run(series([oct3]), {
    WEEKLY_CANDLES: JSON.stringify([candle(oct10, 83_000.5)]),
    WEEKLY_NOW: String(sunday),
  });
  const written: unknown = JSON.parse(result.text);
  if (!Array.isArray(written)) throw new Error("series was not written");

  expect(result.status).toBe(0);
  expect(result.stdout.includes("weekly prices added 1 through 2026-10-10")).toBe(true);
  expect(written.at(-1)).toEqual({ x: oct10 * 1000, y: 83_000.5 });
});

test("two completed Saturdays append in order", async () => {
  const sep26 = saturday("2026-09-26T00:00:00.000Z");
  const result = await run(series([sep26]), {
    WEEKLY_CANDLES: JSON.stringify([candle(oct3, 81_000), candle(oct10, 83_000)]),
    WEEKLY_NOW: String(tuesday),
  });
  const written: unknown = JSON.parse(result.text);

  expect(result.status).toBe(0);
  expect(written).toEqual([
    { x: sep26 * 1000, y: 1 },
    { x: oct3 * 1000, y: 81_000 },
    { x: oct10 * 1000, y: 83_000 },
  ]);
});

test("a missing close leaves the file unchanged", async () => {
  const body = series([oct3]);
  const result = await run(body, {
    WEEKLY_CANDLES: "[]",
    WEEKLY_NOW: String(tuesday),
  });

  expect(result.status).toBe(0);
  expect(result.stderr.includes("weekly prices: no close for 2026-10-10")).toBe(true);
  expect(result.text).toBe(body);
});

test("a broken series fails before a fetch", async () => {
  const result = await run("{", {
    WEEKLY_CANDLES: JSON.stringify([candle(oct10, 83_000)]),
    WEEKLY_NOW: String(tuesday),
  });

  expect(result.status).toBe(1);
  expect(result.stderr.includes("weekly price history is not a series")).toBe(true);
});
