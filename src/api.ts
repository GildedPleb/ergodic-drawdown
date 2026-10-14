import marketData from "./data/datasets/bitcoin_weekly_prices_transformed_2.json";
import { type BitcoinDataPoint } from "./types";

const lastBakedWeek = marketData.at(-1);
if (lastBakedWeek === undefined) throw new Error("weekly price history is empty");
const bakedWeeklyEnd = Math.floor(lastBakedWeek.x / 1000);

const DAY_SECONDS = 86_400;
const WEEK_SECONDS = 7 * DAY_SECONDS;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const isBlockHeight = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isBitcoinPoint = (value: unknown): value is BitcoinDataPoint => {
  if (!isRecord(value)) return false;
  const prices = [value["close"], value["high"], value["low"], value["open"]];
  if (!prices.every(isPositive)) return false;
  if (!isFiniteNumber(value["time"])) return false;
  if (!isFiniteNumber(value["volumefrom"]) || value["volumefrom"] < 0) return false;
  if (!isFiniteNumber(value["volumeto"]) || value["volumeto"] < 0) return false;
  return (
    typeof value["conversionSymbol"] === "string" && typeof value["conversionType"] === "string"
  );
};

const finiteNumber = (value: unknown): number => {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
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

const readResponse = async (url: string): Promise<Response> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response;
};

const readJson = async (url: string): Promise<unknown> => {
  const response = await readResponse(url);
  const body: unknown = await response.json();
  return body;
};

const readText = async (url: string): Promise<string> => {
  const response = await readResponse(url);
  return response.text();
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
  const sorted = [...days].toSorted((first, second) => first[0] - second[0]);
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
    .toSorted((first, second) => first[0] - second[0])
    .map(([time, bar]) => pricePoint(time, bar.open, bar.high, bar.low, bar.close, bar.volume));
};

const loadCoinbasePrice = async (): Promise<number> => {
  const body = await readJson("https://api.coinbase.com/v2/prices/BTC-USD/spot");
  if (!isRecord(body)) throw new Error("unexpected Coinbase price payload");
  const data = body["data"];
  if (!isRecord(data)) throw new Error("unexpected Coinbase price payload");
  return positiveNumber(data["amount"]);
};

const loadCoinGeckoPrice = async (): Promise<number> => {
  const body = await readJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
  );
  if (!isRecord(body)) throw new Error("unexpected CoinGecko price payload");
  const bitcoin = body["bitcoin"];
  if (!isRecord(bitcoin)) throw new Error("unexpected CoinGecko price payload");
  return positiveNumber(bitcoin["usd"]);
};

const loadKrakenPrice = async (): Promise<number> => {
  const body = await readJson("https://api.kraken.com/0/public/Ticker?pair=XBTUSD");
  if (!isRecord(body)) throw new Error("unexpected Kraken price payload");
  const result = body["result"];
  if (!isRecord(result)) throw new Error("unexpected Kraken price payload");
  const pair = result["XXBTZUSD"];
  if (!isRecord(pair)) throw new Error("missing Kraken ticker");
  const close = pair["c"];
  if (!Array.isArray(close)) throw new Error("missing Kraken ticker");
  return positiveNumber(close[0]);
};

const loadSpotPrice = (): Promise<number> =>
  firstWorking("spot price", [
    { name: "Coinbase", load: loadCoinbasePrice },
    { name: "CoinGecko", load: loadCoinGeckoPrice },
    { name: "Kraken", load: loadKrakenPrice },
  ]);

const loadCoinbaseWeeks = async (from: number, to: number): Promise<BitcoinDataPoint[]> => {
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

const loadCoinGeckoWeeks = async (from: number, to: number): Promise<BitcoinDataPoint[]> => {
  const days = Math.max(2, Math.ceil((to - from) / DAY_SECONDS) + 1);
  const body = await readJson(
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`,
  );
  if (!isRecord(body)) throw new Error("unexpected CoinGecko history");
  const prices = body["prices"];
  if (!Array.isArray(prices)) throw new Error("unexpected CoinGecko history");
  const daily: DailyBar[] = [];
  for (const row of prices) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const price = positiveNumber(row[1]);
    daily.push([Math.floor(finiteNumber(row[0]) / 1000), price, price, price, price, 0]);
  }
  const weeks = foldWeeks(daily).filter((point) => point.time > from);
  if (weeks.length === 0) throw new Error("CoinGecko returned no weekly bars");
  return weeks;
};

const loadKrakenWeeks = async (from: number): Promise<BitcoinDataPoint[]> => {
  const body = await readJson("https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=10080");
  if (!isRecord(body)) throw new Error("unexpected Kraken history");
  const result = body["result"];
  if (!isRecord(result)) throw new Error("unexpected Kraken history");
  const rows = result["XXBTZUSD"];
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

const loadTipHeight = async (url: string): Promise<number> => {
  const body = await readJson(url);
  if (!isBlockHeight(body)) {
    throw new Error(`expected a block height, received ${String(body)}`);
  }
  return body;
};

const loadBlockHeight = (): Promise<number> =>
  firstWorking("block height", [
    {
      name: "Blockchain.com",
      load: () => loadTipHeight("https://blockchain.info/q/getblockcount"),
    },
    {
      name: "Blockstream",
      load: () => loadTipHeight("https://blockstream.info/api/blocks/tip/height"),
    },
    {
      name: "Mempool",
      load: () => loadTipHeight("https://mempool.space/api/blocks/tip/height"),
    },
  ]);

export const getCurrentBlockHeight = async (now: number): Promise<number> => {
  const cacheKey = "currentBlockHeight";
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData !== null) {
    let cache: unknown;
    try {
      cache = JSON.parse(cachedData);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      cache = undefined;
    }
    if (isRecord(cache)) {
      const blockHeight = cache["blockHeight"];
      const timestamp = cache["timestamp"];
      if (
        isBlockHeight(blockHeight) &&
        typeof timestamp === "number" &&
        timestamp > now - 120 * 60 * 1000
      ) {
        return blockHeight;
      }
    }
  }
  console.log("...fetching lastest block height");
  const blockHeight = await loadBlockHeight();
  localStorage.setItem(cacheKey, JSON.stringify({ blockHeight, timestamp: now }));
  return blockHeight;
};

const blockTime = (value: unknown): number => {
  if (!isPositive(value)) {
    throw new Error(`expected a block time, received ${String(value)}`);
  }
  return value;
};

const loadBlockchainBlockTime = async (height: number): Promise<number> => {
  const url = `https://blockchain.info/block-height/${height}?format=json`;
  const body = await readJson(url);
  if (!isRecord(body) || !Array.isArray(body["blocks"])) {
    throw new Error(`expected block data from ${url}`);
  }
  const block = body["blocks"][0];
  if (!isRecord(block)) throw new Error(`expected block data from ${url}`);
  return blockTime(block["time"]);
};

const isBlockHash = (value: string): boolean => /^[0-9a-f]{64}$/i.test(value);

const loadEsploraBlockTime = async (origin: string, height: number): Promise<number> => {
  const hashUrl = `${origin}/api/block-height/${height}`;
  const hash = (await readText(hashUrl)).trim();
  if (!isBlockHash(hash)) {
    throw new Error(`expected a block hash, received ${hash}`);
  }
  const block = await readJson(`${origin}/api/block/${hash}`);
  if (!isRecord(block)) throw new Error(`expected block data from ${origin}`);
  return blockTime(block["timestamp"]);
};

const loadBlockTime = (height: number): Promise<number> =>
  firstWorking("block time", [
    {
      name: "Blockchain.com",
      load: () => loadBlockchainBlockTime(height),
    },
    {
      name: "Blockstream",
      load: () => loadEsploraBlockTime("https://blockstream.info", height),
    },
    {
      name: "Mempool",
      load: () => loadEsploraBlockTime("https://mempool.space", height),
    },
  ]);

export const fetchBlockByHeight = async (height: number): Promise<number> => {
  console.log("...fetching block:", height);
  return loadBlockTime(height);
};

// The quote and the weekly series ask together. One flight fills the hour cache.
let spotFlight: { second: number; promise: Promise<BitcoinDataPoint> } | undefined;

export const getCurrentPrice = async (now: number): Promise<BitcoinDataPoint> => {
  const cacheKey = "BTC_PRICE_CACHE";
  const cacheExpiry = 60 * 60;
  const currentTimestamp = Math.floor(now / 1000);
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData !== null) {
    let cache: unknown;
    try {
      cache = JSON.parse(cachedData);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      cache = undefined;
    }
    if (isBitcoinPoint(cache) && currentTimestamp - cache.time < cacheExpiry) {
      return cache;
    }
  }
  if (spotFlight?.second === currentTimestamp) return spotFlight.promise;

  const promise = (async (): Promise<BitcoinDataPoint> => {
    console.log("...fetching current price");
    const spot = await loadSpotPrice();
    const currentPriceData = pricePoint(currentTimestamp, spot, spot, spot, spot);
    localStorage.setItem(cacheKey, JSON.stringify(currentPriceData));
    return currentPriceData;
  })().finally(() => {
    if (spotFlight?.promise === promise) spotFlight = undefined;
  });
  spotFlight = { promise, second: currentTimestamp };
  return promise;
};

export const getInterimWeeklyData = async (now: number): Promise<BitcoinDataPoint[]> => {
  const nowDate = new Date(now);
  const storedWeekly: unknown = JSON.parse(localStorage.getItem("weeklyBTCData") ?? "[]");
  let cachedData = (Array.isArray(storedWeekly) ? storedWeekly.filter(isBitcoinPoint) : [])
    .filter((point) => point.time > bakedWeeklyEnd)
    .toSorted((first, second) => first.time - second.time);
  const lastCachedTimestamp = cachedData.at(-1)?.time ?? bakedWeeklyEnd;
  const currentPriceData = await getCurrentPrice(now);
  const currentTime = Math.floor(nowDate.getTime() / 1000);

  if (lastCachedTimestamp >= currentTime - 604_800) {
    return cachedData.concat(currentPriceData);
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
    cachedData = [...cachedData, ...newData].toSorted((first, second) => first.time - second.time);
    localStorage.setItem("weeklyBTCData", JSON.stringify(cachedData));
  } catch (error) {
    console.error("Error fetching data:", error);
  }
  return cachedData.concat(currentPriceData);
};
