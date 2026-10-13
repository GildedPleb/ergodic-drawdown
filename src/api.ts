import { LRUCache } from "lru-cache";

import { LAST_SAVED_TIMESTAMP } from "./constants";
import { type BitcoinDataPoint, type BlockData } from "./types";

const lruCache = new LRUCache<string, BitcoinDataPoint[]>({ max: 1 });

const DAY_SECONDS = 86_400;
const WEEK_SECONDS = 7 * DAY_SECONDS;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const finiteNumber = (value: unknown): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error(`expected a number, received ${String(value)}`);
  }
  return parsed;
};

const positiveNumber = (value: unknown): number => {
  const parsed = finiteNumber(value);
  if (parsed <= 0) throw new Error(`expected a positive price, received ${parsed}`);
  return parsed;
};

const pricePoint = (
  time: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volumefrom = 0,
): BitcoinDataPoint => ({
  close,
  conversionSymbol: "",
  conversionType: "direct",
  high,
  low,
  open,
  time,
  volumefrom,
  volumeto: 0,
});

const readJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json() as Promise<unknown>;
};

const firstWorking = async <T>(
  label: string,
  sources: Array<{ name: string; load: () => Promise<T> }>,
): Promise<T> => {
  const failures: string[] = [];
  for (const source of sources) {
    try {
      return await source.load();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`${label}: ${source.name} failed: ${message}`);
      failures.push(`${source.name}: ${message}`);
    }
  }
  throw new Error(failures.join("; "));
};

type DailyBar = [
  time: number,
  low: number,
  high: number,
  open: number,
  close: number,
  volume: number,
];

const foldWeeks = (days: DailyBar[]): BitcoinDataPoint[] => {
  const buckets = new Map<
    number,
    { open: number; high: number; low: number; close: number; volume: number }
  >();
  const sorted = [...days].sort(
    (first, second) => first[0] - second[0],
  );
  for (const [time, low, high, open, close, volume] of sorted) {
    const week = Math.floor(time / WEEK_SECONDS) * WEEK_SECONDS;
    const existing = buckets.get(week);
    if (existing === undefined) {
      buckets.set(week, { open, high, low, close, volume });
      continue;
    }
    existing.high = Math.max(existing.high, high);
    existing.low = Math.min(existing.low, low);
    existing.close = close;
    existing.volume += volume;
  }
  return [...buckets.entries()]
    .sort((first, second) => first[0] - second[0])
    .map(([time, bar]) =>
      pricePoint(time, bar.open, bar.high, bar.low, bar.close, bar.volume),
    );
};

const loadCoinbasePrice = async (): Promise<number> => {
  const body = await readJson(
    "https://api.coinbase.com/v2/prices/BTC-USD/spot",
  );
  if (!isRecord(body) || !isRecord(body.data)) {
    throw new Error("unexpected Coinbase price payload");
  }
  return positiveNumber(body.data.amount);
};

const loadCoinGeckoPrice = async (): Promise<number> => {
  const body = await readJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
  );
  if (!isRecord(body) || !isRecord(body.bitcoin)) {
    throw new Error("unexpected CoinGecko price payload");
  }
  return positiveNumber(body.bitcoin.usd);
};

const loadKrakenPrice = async (): Promise<number> => {
  const body = await readJson(
    "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
  );
  if (!isRecord(body) || !isRecord(body.result)) {
    throw new Error("unexpected Kraken price payload");
  }
  const pair = body.result.XXBTZUSD;
  if (!isRecord(pair) || !Array.isArray(pair.c)) {
    throw new Error("missing Kraken ticker");
  }
  return positiveNumber(pair.c[0]);
};

const loadSpotPrice = (): Promise<number> =>
  firstWorking("spot price", [
    { name: "Coinbase", load: loadCoinbasePrice },
    { name: "CoinGecko", load: loadCoinGeckoPrice },
    { name: "Kraken", load: loadKrakenPrice },
  ]);

const loadCoinbaseWeeks = async (
  from: number,
  to: number,
): Promise<BitcoinDataPoint[]> => {
  const days: DailyBar[] = [];
  const window = 290 * DAY_SECONDS;
  for (let start = from; start < to; start += window) {
    const end = Math.min(to, start + window);
    const body = await readJson(
      `https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400&start=${start}&end=${end}`,
    );
    if (!Array.isArray(body)) throw new Error("unexpected Coinbase candles");
    for (const row of body) {
      if (!Array.isArray(row) || row.length < 6) continue;
      days.push([
        finiteNumber(row[0]),
        positiveNumber(row[1]),
        positiveNumber(row[2]),
        positiveNumber(row[3]),
        positiveNumber(row[4]),
        finiteNumber(row[5]),
      ]);
    }
  }
  const weeks = foldWeeks(days).filter((point) => point.time > from);
  if (weeks.length === 0) throw new Error("Coinbase returned no weekly bars");
  return weeks;
};

const loadCoinGeckoWeeks = async (
  from: number,
  to: number,
): Promise<BitcoinDataPoint[]> => {
  const days = Math.max(2, Math.ceil((to - from) / DAY_SECONDS) + 1);
  const body = await readJson(
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`,
  );
  if (!isRecord(body) || !Array.isArray(body.prices)) {
    throw new Error("unexpected CoinGecko history");
  }
  const daily: DailyBar[] = [];
  for (const row of body.prices) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const price = positiveNumber(row[1]);
    daily.push([
      Math.floor(finiteNumber(row[0]) / 1000),
      price,
      price,
      price,
      price,
      0,
    ]);
  }
  const weeks = foldWeeks(daily).filter((point) => point.time > from);
  if (weeks.length === 0) throw new Error("CoinGecko returned no weekly bars");
  return weeks;
};

const loadKrakenWeeks = async (from: number): Promise<BitcoinDataPoint[]> => {
  const body = await readJson(
    "https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=10080",
  );
  if (!isRecord(body) || !isRecord(body.result)) {
    throw new Error("unexpected Kraken history");
  }
  const rows = body.result.XXBTZUSD;
  if (!Array.isArray(rows)) throw new Error("missing Kraken OHLC");
  const weeks: BitcoinDataPoint[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 7) continue;
    const time = finiteNumber(row[0]);
    if (time <= from) continue;
    weeks.push(
      pricePoint(
        time,
        positiveNumber(row[1]),
        positiveNumber(row[2]),
        positiveNumber(row[3]),
        positiveNumber(row[4]),
        finiteNumber(row[6]),
      ),
    );
  }
  if (weeks.length === 0) throw new Error("Kraken returned no weekly bars");
  return weeks;
};

// eslint-disable-next-line functional/functional-parameters
export const getCurrentBlockHeight = async (now: number): Promise<number> => {
  const cacheKey = "currentBlockHeight";
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData !== null) {
    const { blockHeight, timestamp } = JSON.parse(cachedData) as {
      blockHeight: number;
      timestamp: number;
    };
    if (timestamp > now - 120 * 60 * 1000) return blockHeight;
  }
  console.log("...fetching lastest block height");
  const response = await fetch("https://blockchain.info/q/getblockcount");
  if (!response.ok) throw new Error("Failed to fetch current block height");
  const blockHeight = (await response.json()) as number;
  const newData = JSON.stringify({ blockHeight, timestamp: now });
  localStorage.setItem(cacheKey, newData);

  return blockHeight;
};

export const fetchBlockByHeight = async (height: number): Promise<number> => {
  console.log("...fetching block:", height);
  const response = await fetch(
    `https://blockchain.info/block-height/${height}?format=json`,
  );
  if (!response.ok) throw new Error("Failed to fetch block data");
  const data = (await response.json()) as { blocks: BlockData[] };
  return data.blocks[0].time;
};

// eslint-disable-next-line functional/functional-parameters
export const getCurrentPrice = async (
  now: number,
): Promise<BitcoinDataPoint> => {
  const cacheKey = "BTC_PRICE_CACHE";
  // 1 hour cache
  const cacheExpiry = 60 * 60;
  const currentTimestamp = Math.floor(now / 1000);
  const cachedData = localStorage.getItem(cacheKey);

  try {
    if (cachedData !== null) {
      const cache = JSON.parse(cachedData) as BitcoinDataPoint;
      if (currentTimestamp - cache.time < cacheExpiry) {
        return cache;
      }
    }
    console.log("...fetching current price");
    const spot = await loadSpotPrice();
    const currentPriceData = pricePoint(
      currentTimestamp,
      spot,
      spot,
      spot,
      spot,
    );
    localStorage.setItem(cacheKey, JSON.stringify(currentPriceData));

    return currentPriceData;
  } catch (error) {
    console.error("Error fetching current price:", error);
    return {
      close: 0,
      conversionSymbol: "",
      conversionType: "direct",
      high: 0,
      low: 0,
      open: 0,
      time: 0,
      volumefrom: 0,
      volumeto: 0,
    };
  }
};

// eslint-disable-next-line functional/functional-parameters
export const getInterimWeeklyData = async (
  now: number,
): Promise<BitcoinDataPoint[]> => {
  const cache = lruCache.get("interim");
  if (cache !== undefined) {
    return cache;
  }
  const nowDate = new Date(now);
  let cachedData = JSON.parse(
    localStorage.getItem("weeklyBTCData") ?? "[]",
  ) as BitcoinDataPoint[];
  if (cachedData.length === 0) {
    cachedData = [
      {
        close: 60_940.64,
        conversionSymbol: "",
        conversionType: "direct",
        high: 64_119.34,
        low: 60_827.83,
        open: 64_119.34,
        time: 1_719_014_400,
        volumefrom: 16_592.24,
        volumeto: 1_020_916_335.92,
      },
    ];
  }
  const lastCachedTimestamp = cachedData.at(-1)?.time ?? LAST_SAVED_TIMESTAMP;
  const currentPriceData = await getCurrentPrice(now);
  const currentTime = Math.floor(nowDate.getTime() / 1000);

  if (lastCachedTimestamp >= currentTime - 604_800) {
    // eslint-disable-next-line unicorn/prefer-spread
    const interim = cachedData.concat(currentPriceData);
    lruCache.set("interim", interim);
    return interim;
  }
  try {
    console.log("...fetching weekly interim price action");
    const newData = await firstWorking("weekly history", [
      {
        name: "Coinbase",
        load: () => loadCoinbaseWeeks(lastCachedTimestamp, currentTime),
      },
      {
        name: "CoinGecko",
        load: () => loadCoinGeckoWeeks(lastCachedTimestamp, currentTime),
      },
      {
        name: "Kraken",
        load: () => loadKrakenWeeks(lastCachedTimestamp),
      },
    ]);
    cachedData = [...cachedData, ...newData].sort(
      (first, second) => first.time - second.time,
    );
    localStorage.setItem("weeklyBTCData", JSON.stringify(cachedData));
  } catch (error) {
    console.error("Error fetching data:", error);
  }
  // eslint-disable-next-line unicorn/prefer-spread
  const interim = cachedData.concat(currentPriceData);
  lruCache.set("interim", interim);
  return interim;
};
