import { readFileSync, writeFileSync } from "node:fs";

const DAY = 86_400;
const WEEK = 7 * DAY;

const weeklyFile = (): string =>
  process.env["WEEKLY_FILE"] ?? "src/data/datasets/bitcoin_weekly_prices_transformed_2.json";

const dayLabel = (seconds: number): string => new Date(seconds * 1000).toISOString().slice(0, 10);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPoint = (value: unknown): value is { x: number; y: number } =>
  isRecord(value) &&
  typeof value["x"] === "number" &&
  Number.isFinite(value["x"]) &&
  typeof value["y"] === "number" &&
  Number.isFinite(value["y"]) &&
  value["y"] > 0;

const isSaturdayMidnight = (seconds: number): boolean =>
  seconds % DAY === 0 && new Date(seconds * 1000).getUTCDay() === 6;

const targetSaturday = (now: number): number => {
  let end = now - (now % DAY);
  while (!isSaturdayMidnight(end)) end -= DAY;
  if (end === now - (now % DAY)) end -= WEEK;
  return end;
};

const readNow = (): number => {
  const override = process.env["WEEKLY_NOW"];
  if (override === undefined) return Math.floor(Date.now() / 1000);
  const parsed = Number(override);
  if (!Number.isFinite(parsed)) throw new Error("WEEKLY_NOW is not a unix time");
  return parsed;
};

const readSeries = (raw: string): Array<{ x: number; y: number }> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error("weekly price history is not a series", { cause: error });
  }
  if (!Array.isArray(parsed) || !parsed.every(isPoint)) {
    throw new Error("weekly price history is not a series");
  }
  return parsed;
};

const candleCloses = (body: unknown): Map<number, number> | undefined => {
  if (!Array.isArray(body)) return undefined;
  const closes = new Map<number, number>();
  for (const row of body) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const time = row[0];
    const close = row[4];
    if (typeof time !== "number" || typeof close !== "number" || !(close > 0)) continue;
    closes.set(time, close);
  }
  return closes;
};

type CandleFetch = (url: string, init: RequestInit) => Promise<Response>;

const loadCloses = async (
  start: number,
  end: number,
  fetchCandles: CandleFetch,
): Promise<Map<number, number> | undefined> => {
  const override = process.env["WEEKLY_CANDLES"];
  if (override !== undefined) {
    const parsed: unknown = JSON.parse(override);
    return candleCloses(parsed);
  }
  const closes = new Map<number, number>();
  for (let cursor = start; cursor <= end; cursor += 290 * DAY) {
    const windowEnd = Math.min(end + DAY, cursor + 290 * DAY);
    const url = `https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400&start=${cursor}&end=${windowEnd}`;
    try {
      const response = await fetchCandles(url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const body: unknown = await response.json();
      const page = candleCloses(body);
      if (page === undefined) throw new Error("unexpected Coinbase candles");
      for (const [time, close] of page) closes.set(time, close);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`weekly prices: Coinbase failed: ${message}`);
      return undefined;
    }
    if (cursor + 290 * DAY <= end) await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return closes;
};

export type WeeklyPlan =
  | { kind: "added"; count: number; text: string; through: string }
  | { kind: "current"; text: string; through: string }
  | { kind: "missing"; day: string; text: string }
  | { kind: "unchanged"; text: string };

// Closes are supplied by the caller. The file is rewritten only when the text changes.
export const planWeeklyUpdate = (
  raw: string,
  now: number,
  closes: Map<number, number> | undefined,
): WeeklyPlan => {
  const series = readSeries(raw);
  const last = series.at(-1);
  if (last === undefined) throw new Error("weekly price history is empty");
  const lastSeconds = Math.floor(last.x / 1000);
  const end = targetSaturday(now);
  if (lastSeconds >= end) {
    return { kind: "current", text: raw, through: dayLabel(lastSeconds) };
  }
  if (!isSaturdayMidnight(lastSeconds)) {
    throw new Error("weekly price history does not end on a Saturday");
  }
  if (closes === undefined) return { kind: "unchanged", text: raw };
  const start = lastSeconds + WEEK;
  const added: Array<{ x: number; y: number }> = [];
  for (let time = start; time <= end; time += WEEK) {
    const close = closes.get(time);
    if (close === undefined) {
      return { kind: "missing", day: dayLabel(time), text: raw };
    }
    added.push({ x: time * 1000, y: close });
  }
  const trimmed = raw.replace(/\s*]\s*$/, "").trimEnd();
  const chunk = added
    .map(
      (point) =>
        `  {\n    "x": ${JSON.stringify(point.x)},\n    "y": ${JSON.stringify(point.y)}\n  }`,
    )
    .join(",\n");
  return {
    count: added.length,
    kind: "added",
    text: `${trimmed},\n${chunk}\n]\n`,
    through: dayLabel(end),
  };
};

type CloseLoader = (start: number, end: number) => Promise<Map<number, number> | undefined>;

// Pass `load` or `fetchCandles` from a test. The CLI passes neither and calls Coinbase.
export const runWeeklyPrices = async (deps?: {
  fetchCandles?: CandleFetch;
  load?: CloseLoader;
}): Promise<void> => {
  const now = readNow();
  const path = weeklyFile();
  const raw = readFileSync(path, "utf8");
  const series = readSeries(raw);
  const last = series.at(-1);
  if (last === undefined) throw new Error("weekly price history is empty");
  const lastSeconds = Math.floor(last.x / 1000);
  const end = targetSaturday(now);
  const load: CloseLoader =
    deps?.load ?? ((from, to) => loadCloses(from, to, deps?.fetchCandles ?? fetch));
  const closes =
    lastSeconds >= end || !isSaturdayMidnight(lastSeconds)
      ? undefined
      : await load(lastSeconds + WEEK, end);
  const plan = planWeeklyUpdate(raw, now, closes);
  if (plan.kind === "current") {
    console.log(`weekly prices current through ${plan.through}`);
    return;
  }
  if (plan.kind === "missing") {
    console.warn(`weekly prices: no close for ${plan.day}`);
    return;
  }
  if (plan.kind === "unchanged") return;
  writeFileSync(path, plan.text);
  console.log(`weekly prices added ${plan.count} through ${plan.through}`);
};

const entry = process.argv[1];
if (entry !== undefined && entry.endsWith("update-weekly-prices.ts")) {
  await runWeeklyPrices();
}
