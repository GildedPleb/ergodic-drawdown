import { afterEach, beforeEach, expect, test } from "bun:test";

import {
  fetchBlockByHeight,
  getCurrentBlockHeight,
  getCurrentPrice,
  getInterimWeeklyData,
} from "../src/api";
import marketData from "../src/data/datasets/bitcoin_weekly_prices_transformed_2.json";

const now = 1_713_571_767_000;

const memoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    clear: () => {
      values.clear();
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

const jsonResponse = (body: unknown, status = 200): Response =>
  Response.json(body, { status, statusText: status === 200 ? "OK" : "Service Unavailable" });

const textResponse = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    statusText: status === 200 ? "OK" : "Service Unavailable",
    headers: { "content-type": "text/plain" },
  });

const blockHash = "0000000000000000000320283a032748cef8227873ff4872689bf23f1cda83a5";

const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const failed = (): Response => jsonResponse({ error: "down" }, 503);

const captureWarnings = (): string[] => {
  const lines: string[] = [];
  console.warn = (message?: unknown) => {
    lines.push(String(message));
  };
  return lines;
};

let restoreConsole: (() => void) | undefined;

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
  const log = console.log;
  const warn = console.warn;
  const error = console.error;
  console.log = () => undefined;
  console.warn = () => undefined;
  console.error = () => undefined;
  restoreConsole = () => {
    console.log = log;
    console.warn = warn;
    console.error = error;
  };
});

afterEach(() => {
  restoreConsole?.();
});

test("a failed block-height response throws", async () => {
  globalThis.fetch = () => Promise.resolve(failed());

  await expect(getCurrentBlockHeight(now)).rejects.toThrow("Blockchain.com: 503");
  await expect(fetchBlockByHeight(840_000)).rejects.toThrow(
    "mempool.space/api/block-height/840000",
  );
});

test("a zero block height cycles to the next source", async () => {
  const warnings = captureWarnings();
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.endsWith("/q/getblockcount")) return Promise.resolve(jsonResponse(0));
    if (url.endsWith("/blocks/tip/height") && url.includes("blockstream.info")) {
      return Promise.resolve(jsonResponse(840_000));
    }
    return Promise.resolve(failed());
  };

  expect(await getCurrentBlockHeight(now)).toBe(840_000);
  expect(warnings).toEqual([
    "block height: Blockchain.com failed: expected a block height, received 0",
  ]);
});

test("a failed block height cycles to the next source", async () => {
  const warnings = captureWarnings();
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.includes("blockstream.info")) return Promise.resolve(jsonResponse(840_000));
    return Promise.resolve(failed());
  };

  expect(await getCurrentBlockHeight(now)).toBe(840_000);
  expect(warnings).toEqual([
    "block height: Blockchain.com failed: 503 Service Unavailable for https://blockchain.info/q/getblockcount",
  ]);
});

test("a stored zero block height is not used", async () => {
  localStorage.setItem("currentBlockHeight", JSON.stringify({ blockHeight: 0, timestamp: now }));
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.endsWith("/q/getblockcount")) return Promise.resolve(jsonResponse(840_000));
    return Promise.resolve(failed());
  };

  expect(await getCurrentBlockHeight(now)).toBe(840_000);
});

test("a block-height response returns the height and the block time", async () => {
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.endsWith("/q/getblockcount")) return Promise.resolve(jsonResponse(840_000));
    if (url.includes("/block-height/840000")) {
      return Promise.resolve(jsonResponse({ blocks: [{ time: 1_713_571_767 }] }));
    }
    return Promise.resolve(failed());
  };

  expect(await getCurrentBlockHeight(now)).toBe(840_000);
  expect(await fetchBlockByHeight(840_000)).toBe(1_713_571_767);
});

test("a failed block time cycles to the next source", async () => {
  const warnings = captureWarnings();
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url === `https://blockstream.info/api/block-height/840000`) {
      return Promise.resolve(textResponse(blockHash));
    }
    if (url === `https://blockstream.info/api/block/${blockHash}`) {
      return Promise.resolve(jsonResponse({ timestamp: 1_713_571_767 }));
    }
    return Promise.resolve(failed());
  };

  expect(await fetchBlockByHeight(840_000)).toBe(1_713_571_767);
  expect(warnings).toEqual([
    "block time: Blockchain.com failed: 503 Service Unavailable for https://blockchain.info/block-height/840000?format=json",
  ]);
});

test("a zero block time cycles to the next source", async () => {
  const warnings = captureWarnings();
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.includes("blockchain.info/block-height/")) {
      return Promise.resolve(jsonResponse({ blocks: [{ time: 0 }] }));
    }
    if (url === `https://blockstream.info/api/block-height/840000`) {
      return Promise.resolve(textResponse(blockHash));
    }
    if (url === `https://blockstream.info/api/block/${blockHash}`) {
      return Promise.resolve(jsonResponse({ timestamp: 1_713_571_767 }));
    }
    return Promise.resolve(failed());
  };

  expect(await fetchBlockByHeight(840_000)).toBe(1_713_571_767);
  expect(warnings).toEqual([
    "block time: Blockchain.com failed: expected a block time, received 0",
  ]);
});

test("block time uses mempool when the earlier sources fail", async () => {
  const warnings = captureWarnings();
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url === `https://mempool.space/api/block-height/840000`) {
      return Promise.resolve(textResponse(blockHash));
    }
    if (url === `https://mempool.space/api/block/${blockHash}`) {
      return Promise.resolve(jsonResponse({ timestamp: 1_713_571_767 }));
    }
    return Promise.resolve(failed());
  };

  expect(await fetchBlockByHeight(840_000)).toBe(1_713_571_767);
  expect(warnings).toEqual([
    "block time: Blockchain.com failed: 503 Service Unavailable for https://blockchain.info/block-height/840000?format=json",
    "block time: Blockstream failed: 503 Service Unavailable for https://blockstream.info/api/block-height/840000",
  ]);
});

test("a block hash that is not hex cycles to the next source", async () => {
  const warnings = captureWarnings();
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.includes("blockstream.info/api/block-height/")) {
      return Promise.resolve(textResponse("nope"));
    }
    if (url === `https://mempool.space/api/block-height/840000`) {
      return Promise.resolve(textResponse(blockHash));
    }
    if (url === `https://mempool.space/api/block/${blockHash}`) {
      return Promise.resolve(jsonResponse({ timestamp: 1_713_571_767 }));
    }
    return Promise.resolve(failed());
  };

  expect(await fetchBlockByHeight(840_000)).toBe(1_713_571_767);
  expect(warnings[1]).toBe("block time: Blockstream failed: expected a block hash, received nope");
});

test("a recent baked week does not request weekly history", async () => {
  const last = marketData.at(-1);
  if (last === undefined) throw new Error("weekly price history is empty");
  const bakedEnd = Math.floor(last.x / 1000);
  const urls: string[] = [];
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    urls.push(url);
    if (url.includes("api.coinbase.com/v2/prices")) {
      return Promise.resolve(jsonResponse({ data: { amount: "61000" } }));
    }
    return Promise.resolve(failed());
  };

  const points = await getInterimWeeklyData((bakedEnd + 3 * 86_400) * 1000);

  expect(points.length).toBe(1);
  expect(points[0]?.close).toBe(61_000);
  expect(points[0]?.time).toBe(bakedEnd + 3 * 86_400);

  const later = await getInterimWeeklyData((bakedEnd + 4 * 86_400) * 1000);

  expect(later[0]?.time).toBe(bakedEnd + 4 * 86_400);
  expect(
    urls.some(
      (url) => url.includes("/candles") || url.includes("market_chart") || url.includes("/OHLC"),
    ),
  ).toBe(false);
});

test("a failed price response throws", async () => {
  globalThis.fetch = () => Promise.resolve(failed());

  await expect(getCurrentPrice(now)).rejects.toThrow("Coinbase: 503");
});

test("a stored zero price is not used", async () => {
  localStorage.setItem(
    "BTC_PRICE_CACHE",
    JSON.stringify({
      close: 0,
      conversionSymbol: "",
      conversionType: "direct",
      high: 0,
      low: 0,
      open: 0,
      time: Math.floor(now / 1000),
      volumefrom: 0,
      volumeto: 0,
    }),
  );
  globalThis.fetch = () => Promise.resolve(jsonResponse({ data: { amount: "61000" } }));

  expect((await getCurrentPrice(now)).close).toBe(61_000);
});

test("a zero price cycles to the next source", async () => {
  const warnings = captureWarnings();
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.includes("api.coinbase.com")) {
      return Promise.resolve(jsonResponse({ data: { amount: "0" } }));
    }
    if (url.includes("api.coingecko.com")) {
      return Promise.resolve(jsonResponse({ bitcoin: { usd: 61_000 } }));
    }
    return Promise.resolve(failed());
  };

  expect((await getCurrentPrice(now)).close).toBe(61_000);
  expect(warnings).toEqual(["spot price: Coinbase failed: expected a positive price, received 0"]);
});

test("the first working price source supplies the spot", async () => {
  const warnings = captureWarnings();
  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.includes("api.coinbase.com")) return Promise.resolve(failed());
    if (url.includes("api.coingecko.com")) {
      return Promise.resolve(jsonResponse({ bitcoin: { usd: 61_000 } }));
    }
    return Promise.resolve(failed());
  };

  const point = await getCurrentPrice(now);

  expect(point.close).toBe(61_000);
  expect(point.open).toBe(61_000);
  expect(point.high).toBe(61_000);
  expect(point.low).toBe(61_000);
  expect(point.time).toBe(Math.floor(now / 1000));
  expect(warnings).toEqual([
    "spot price: Coinbase failed: 503 Service Unavailable for https://api.coinbase.com/v2/prices/BTC-USD/spot",
  ]);
});
