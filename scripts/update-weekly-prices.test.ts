import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "bun:test";

import { planWeeklyUpdate, runWeeklyPrices } from "./update-weekly-prices";

const saturday = (iso: string): number => Math.floor(Date.parse(iso) / 1000);

const oct3 = saturday("2026-10-03T00:00:00.000Z");
const oct10 = saturday("2026-10-10T00:00:00.000Z");
const tuesday = saturday("2026-10-13T15:00:00.000Z");
const saturdayAfternoon = saturday("2026-10-10T15:00:00.000Z");
const sunday = saturday("2026-10-11T01:00:00.000Z");

const series = (times: number[]): string => {
  const points = times.map((time) => `  {\n    "x": ${time * 1000},\n    "y": 1\n  }`);
  return `[\n${points.join(",\n")}\n]\n`;
};

const closes = (rows: Array<[number, number]>): Map<number, number> => new Map(rows);

test("a finished week is left in place", () => {
  const body = series([oct10]);
  const plan = planWeeklyUpdate(body, tuesday, closes([[oct10, 80_000]]));

  expect(plan).toEqual({ kind: "current", text: body, through: "2026-10-10" });
});

test("an unfinished Saturday stays out of the file", () => {
  const body = series([oct3]);
  const plan = planWeeklyUpdate(body, saturdayAfternoon, closes([[oct10, 83_000]]));

  expect(plan).toEqual({ kind: "current", text: body, through: "2026-10-03" });
});

test("a completed Saturday is appended", () => {
  const plan = planWeeklyUpdate(series([oct3]), sunday, closes([[oct10, 83_000.5]]));
  if (plan.kind !== "added") throw new Error("expected an appended week");
  const written: unknown = JSON.parse(plan.text);
  if (!Array.isArray(written)) throw new Error("series was not written");

  expect(plan.count).toBe(1);
  expect(plan.through).toBe("2026-10-10");
  expect(written.at(-1)).toEqual({ x: oct10 * 1000, y: 83_000.5 });
});

test("two completed Saturdays append in order", () => {
  const sep26 = saturday("2026-09-26T00:00:00.000Z");
  const plan = planWeeklyUpdate(
    series([sep26]),
    tuesday,
    closes([
      [oct3, 81_000],
      [oct10, 83_000],
    ]),
  );
  if (plan.kind !== "added") throw new Error("expected appended weeks");
  const written: unknown = JSON.parse(plan.text);

  expect(written).toEqual([
    { x: sep26 * 1000, y: 1 },
    { x: oct3 * 1000, y: 81_000 },
    { x: oct10 * 1000, y: 83_000 },
  ]);
});

test("a missing close leaves the file unchanged", () => {
  const body = series([oct3]);
  const plan = planWeeklyUpdate(body, tuesday, closes([]));

  expect(plan).toEqual({ day: "2026-10-10", kind: "missing", text: body });
});

test("a broken series fails before a fetch", () => {
  let message = "";
  try {
    planWeeklyUpdate("{", tuesday, closes([[oct10, 83_000]]));
  } catch (error) {
    message = error instanceof Error ? error.message : "";
  }

  expect(message).toBe("weekly price history is not a series");
});

test("a parsed value that is not a series fails before a fetch", () => {
  let message = "";
  try {
    planWeeklyUpdate("{}", tuesday, closes([[oct10, 83_000]]));
  } catch (error) {
    message = error instanceof Error ? error.message : "";
  }

  expect(message).toBe("weekly price history is not a series");
});

test("an empty series fails before a fetch", () => {
  let message = "";
  try {
    planWeeklyUpdate("[]", tuesday, closes([[oct10, 83_000]]));
  } catch (error) {
    message = error instanceof Error ? error.message : "";
  }

  expect(message).toBe("weekly price history is empty");
});

test("a history that does not end on a Saturday fails before a fetch", () => {
  const friday = saturday("2026-10-09T00:00:00.000Z");
  let message = "";
  try {
    planWeeklyUpdate(series([friday]), tuesday, closes([[oct10, 83_000]]));
  } catch (error) {
    message = error instanceof Error ? error.message : "";
  }

  expect(message).toBe("weekly price history does not end on a Saturday");
});

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : "");

const futureSaturday = (): number => {
  const day = 86_400;
  let end = Math.floor(Date.now() / 1000) + 14 * day;
  end -= end % day;
  while (new Date(end * 1000).getUTCDay() !== 6) end += day;
  return end;
};

const dayLabel = (seconds: number): string => new Date(seconds * 1000).toISOString().slice(0, 10);

const offline = (): Promise<Response> => {
  throw new Error("weekly price tests do not call Coinbase");
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : "Service Unavailable",
  });

type WeeklyDeps = NonNullable<Parameters<typeof runWeeklyPrices>[0]>;

const runOnFile = async (
  body: string,
  env: { candles?: string; now?: string },
  deps: WeeklyDeps,
): Promise<{ logs: string[]; text: string; warnings: string[] }> => {
  const dir = mkdtempSync(join(tmpdir(), "weekly-prices-"));
  const file = join(dir, "weeks.json");
  const previous = {
    candles: process.env["WEEKLY_CANDLES"],
    file: process.env["WEEKLY_FILE"],
    log: console.log,
    now: process.env["WEEKLY_NOW"],
    warn: console.warn,
  };
  const logs: string[] = [];
  const warnings: string[] = [];
  writeFileSync(file, body);
  process.env["WEEKLY_FILE"] = file;
  if (env.now === undefined) delete process.env["WEEKLY_NOW"];
  else process.env["WEEKLY_NOW"] = env.now;
  if (env.candles === undefined) delete process.env["WEEKLY_CANDLES"];
  else process.env["WEEKLY_CANDLES"] = env.candles;
  console.log = (message?: unknown) => {
    logs.push(String(message));
  };
  console.warn = (message?: unknown) => {
    warnings.push(String(message));
  };
  try {
    await runWeeklyPrices(deps);
    return { logs, text: readFileSync(file, "utf8"), warnings };
  } finally {
    if (previous.file === undefined) delete process.env["WEEKLY_FILE"];
    else process.env["WEEKLY_FILE"] = previous.file;
    if (previous.now === undefined) delete process.env["WEEKLY_NOW"];
    else process.env["WEEKLY_NOW"] = previous.now;
    if (previous.candles === undefined) delete process.env["WEEKLY_CANDLES"];
    else process.env["WEEKLY_CANDLES"] = previous.candles;
    console.log = previous.log;
    console.warn = previous.warn;
    rmSync(dir, { recursive: true, force: true });
  }
};

const noRequest: WeeklyDeps = {
  load: () => Promise.reject(new Error("weekly price tests do not call Coinbase")),
};

test("a current file reads the clock and makes no request", async () => {
  const end = futureSaturday();
  const body = series([end]);
  const ran = await runOnFile(body, {}, noRequest);

  expect(ran.logs).toEqual([`weekly prices current through ${dayLabel(end)}`]);
  expect(ran.warnings).toEqual([]);
  expect(ran.text).toBe(body);
});

test("WEEKLY_NOW must be a unix time", async () => {
  let message = "";
  try {
    await runOnFile(series([oct10]), { now: "nope" }, noRequest);
  } catch (error) {
    message = messageOf(error);
  }

  expect(message).toBe("WEEKLY_NOW is not a unix time");
});

test("the command rejects an empty file", async () => {
  let message = "";
  try {
    await runOnFile("[]\n", { now: String(tuesday) }, noRequest);
  } catch (error) {
    message = messageOf(error);
  }

  expect(message).toBe("weekly price history is empty");
});

test("the command rejects a file that does not end on a Saturday", async () => {
  const friday = saturday("2026-10-09T00:00:00.000Z");
  let message = "";
  try {
    await runOnFile(series([friday]), { now: String(tuesday) }, noRequest);
  } catch (error) {
    message = messageOf(error);
  }

  expect(message).toBe("weekly price history does not end on a Saturday");
});

test("the command leaves the file alone when a close is missing", async () => {
  const body = series([oct3]);
  const ran = await runOnFile(body, { now: String(tuesday) }, { load: async () => new Map() });

  expect(ran.logs).toEqual([]);
  expect(ran.warnings).toEqual(["weekly prices: no close for 2026-10-10"]);
  expect(ran.text).toBe(body);
});

test("a supplied close is appended", async () => {
  const ran = await runOnFile(
    series([oct3]),
    { now: String(sunday) },
    { load: async () => closes([[oct10, 83_000.5]]) },
  );
  const written: unknown = JSON.parse(ran.text);

  expect(ran.logs).toEqual(["weekly prices added 1 through 2026-10-10"]);
  expect(written).toEqual([
    { x: oct3 * 1000, y: 1 },
    { x: oct10 * 1000, y: 83_000.5 },
  ]);
});

test("a candle payload that is not a list leaves the file alone", async () => {
  const body = series([oct3]);
  const ran = await runOnFile(
    body,
    { candles: "{}", now: String(tuesday) },
    { fetchCandles: offline },
  );

  expect(ran.logs).toEqual([]);
  expect(ran.warnings).toEqual([]);
  expect(ran.text).toBe(body);
});

test("rows that are not daily closes are skipped", async () => {
  const candles = JSON.stringify([
    "skip",
    [oct10],
    [oct10, 0, 0, 0, "no"],
    [oct10, 0, 0, 0, 0],
    [oct10, 1, 2, 3, 83_000.5],
  ]);
  const ran = await runOnFile(
    series([oct3]),
    { candles, now: String(sunday) },
    { fetchCandles: offline },
  );
  const written: unknown = JSON.parse(ran.text);

  expect(ran.logs).toEqual(["weekly prices added 1 through 2026-10-10"]);
  expect(ran.warnings).toEqual([]);
  expect(written).toEqual([
    { x: oct3 * 1000, y: 1 },
    { x: oct10 * 1000, y: 83_000.5 },
  ]);
});

test("a Coinbase page appends the completed Saturday", async () => {
  const urls: string[] = [];
  const ran = await runOnFile(
    series([oct3]),
    { now: String(sunday) },
    {
      fetchCandles: (url) => {
        urls.push(url);
        return Promise.resolve(jsonResponse([[oct10, 1, 2, 3, 83_000.5]]));
      },
    },
  );
  const written: unknown = JSON.parse(ran.text);

  expect(urls.length).toBe(1);
  expect(urls[0]?.includes("api.exchange.coinbase.com/products/BTC-USD/candles")).toBe(true);
  expect(ran.logs).toEqual(["weekly prices added 1 through 2026-10-10"]);
  expect(written).toEqual([
    { x: oct3 * 1000, y: 1 },
    { x: oct10 * 1000, y: 83_000.5 },
  ]);
});

test("a failed Coinbase response leaves the file alone", async () => {
  const body = series([oct3]);
  const ran = await runOnFile(
    body,
    { now: String(sunday) },
    {
      fetchCandles: () => Promise.resolve(jsonResponse({ error: "down" }, 503)),
    },
  );

  expect(ran.logs).toEqual([]);
  expect(ran.warnings).toEqual(["weekly prices: Coinbase failed: 503 Service Unavailable"]);
  expect(ran.text).toBe(body);
});

test("an unexpected Coinbase payload leaves the file alone", async () => {
  const body = series([oct3]);
  const ran = await runOnFile(
    body,
    { now: String(sunday) },
    {
      fetchCandles: () => Promise.resolve(jsonResponse({ nope: true })),
    },
  );

  expect(ran.logs).toEqual([]);
  expect(ran.warnings).toEqual(["weekly prices: Coinbase failed: unexpected Coinbase candles"]);
  expect(ran.text).toBe(body);
});

test("a Coinbase network error leaves the file alone", async () => {
  const body = series([oct3]);
  const ran = await runOnFile(
    body,
    { now: String(sunday) },
    {
      fetchCandles: () => Promise.reject(new Error("offline")),
    },
  );

  expect(ran.logs).toEqual([]);
  expect(ran.warnings).toEqual(["weekly prices: Coinbase failed: offline"]);
  expect(ran.text).toBe(body);
});
