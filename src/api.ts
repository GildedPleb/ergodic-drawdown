import { LAST_SAVED_TIMESTAMP } from "./constants";
import { type BitcoinDataPoint, type BlockData } from "./types";

const CURRENT_PRICE = "current price";

// eslint-disable-next-line functional/functional-parameters
export const getCurrentBlockHeight = async (now: number): Promise<number> => {
  const cacheKey = "currentBlockHeight";
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData !== null) {
    const { blockHeight, timestamp } = JSON.parse(cachedData) as {
      blockHeight: number;
      timestamp: number;
    };
    if (timestamp > now - 10 * 60 * 1000) return blockHeight;
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
  console.time(CURRENT_PRICE);
  const url = `https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD`;
  const cacheKey = "BTC_PRICE_CACHE";
  // 1 hour cache
  const cacheExpiry = 60 * 60;
  const currentTimestamp = Math.floor(now / 1000);
  const cachedData = localStorage.getItem(cacheKey);

  try {
    if (cachedData !== null) {
      const cache = JSON.parse(cachedData) as BitcoinDataPoint;
      if (currentTimestamp - cache.time < cacheExpiry) {
        console.timeEnd(CURRENT_PRICE);
        return cache;
      }
    }
    console.log("...fetching current price");
    const response = await fetch(url);
    const data = (await response.json()) as { USD: number };

    const currentPriceData: BitcoinDataPoint = {
      close: data.USD,
      conversionSymbol: "",
      conversionType: "direct",
      high: data.USD,
      low: data.USD,
      open: data.USD,
      time: currentTimestamp,
      volumefrom: 0,
      volumeto: 0,
    };
    localStorage.setItem(cacheKey, JSON.stringify(currentPriceData));
    console.timeEnd(CURRENT_PRICE);

    return currentPriceData;
  } catch (error) {
    console.error("Error fetching current price:", error);
    console.timeEnd(CURRENT_PRICE);
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
  console.time("interim");
  const nowDate = new Date(now);
  const startOfWeek = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate() - nowDate.getDay(),
  );
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekTimestamp = Math.floor(startOfWeek.getTime() / 1000);
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
  const secondsSinceLastCache = nowDate.getTime() / 1000 - lastCachedTimestamp;
  const weeksSinceLastCache = Math.floor(
    secondsSinceLastCache / (7 * 24 * 60 * 60),
  );
  const currentTime = Math.floor(nowDate.getTime() / 1000);
  if (lastCachedTimestamp >= currentTime - 604_800) {
    console.timeEnd("interim");
    return [...cachedData, currentPriceData];
  }
  const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${weeksSinceLastCache}&toTs=${startOfWeekTimestamp}&aggregate=7`;
  try {
    console.log("...fetching weekly interim price action");
    const response = await fetch(url);
    const data = (await response.json()) as {
      Data?: { Data: BitcoinDataPoint[] };
    };
    if (data.Data?.Data === undefined) {
      console.error("No data found in response");
    } else {
      const newData = data.Data.Data.filter(
        ({ time }) => time > lastCachedTimestamp,
      );
      cachedData = [...cachedData, ...newData].sort(
        (first, second) => first.time - second.time,
      );
      localStorage.setItem("weeklyBTCData", JSON.stringify(cachedData));
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  console.timeEnd("interim");
  return [...cachedData, currentPriceData];
};
