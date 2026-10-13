import { afterEach, beforeEach, expect, test } from "bun:test";

import { fetchBlockByHeight, getCurrentBlockHeight, getCurrentPrice } from "../src/api";

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

const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const failed = (): Response => jsonResponse({ error: "down" }, 503);

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

  await expect(getCurrentBlockHeight(now)).rejects.toThrow("Failed to fetch current block height");
  await expect(fetchBlockByHeight(840_000)).rejects.toThrow("Failed to fetch block data");
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

test("a failed price response returns a zero point", async () => {
  globalThis.fetch = () => Promise.resolve(failed());

  expect(await getCurrentPrice(now)).toEqual({
    close: 0,
    conversionSymbol: "",
    conversionType: "direct",
    high: 0,
    low: 0,
    open: 0,
    time: 0,
    volumefrom: 0,
    volumeto: 0,
  });
});

test("the first working price source supplies the spot", async () => {
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
});
