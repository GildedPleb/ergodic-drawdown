import memoize from "memoizee";

import { BLOCKS_PER_WEEK, BLOCKS_PER_YEAR, HALVING_INTERVAL } from "../../constants";
import { defineModel } from "./define";

const getRewardForHalving = memoize((halvingIndex: number): number => {
  return 50 / 2 ** halvingIndex;
});

const calculateTotalStock = memoize((blockNumber: number): number => {
  let stock = 0;
  const halvingCount = Math.floor(blockNumber / HALVING_INTERVAL);
  for (let index = 0; index < halvingCount; index++)
    stock += HALVING_INTERVAL * getRewardForHalving(index);
  const remainingBlocks = blockNumber % HALVING_INTERVAL;
  stock += remainingBlocks * getRewardForHalving(halvingCount);
  return stock;
});

const calculateOneYearFlow = memoize((blockNumber: number): number => {
  const startBlock = Math.max(0, blockNumber - BLOCKS_PER_YEAR);
  return calculateTotalStock(blockNumber) - calculateTotalStock(startBlock);
});

const stockToFlowModelNew = defineModel({
  description:
    "Stock and flow are the same counts as the original stock-to-flow model. The coefficients and the 68% band are the 2024 refit, and they are fixed. This entry has no setting.",
  maxPrice: ({ currentBlock, week }): number => {
    const blockToFind = currentBlock + week * BLOCKS_PER_WEEK;
    const stock = calculateTotalStock(blockToFind);
    const flow = calculateOneYearFlow(blockToFind);
    const stockToFlow = stock / flow;
    const basePrice = 0.25 * stockToFlow ** 3;
    const confidence = (68 / 100) * basePrice;
    return basePrice + confidence;
  },
  minPrice: ({ currentBlock, week }): number => {
    const blockToFind = currentBlock + week * BLOCKS_PER_WEEK;
    const stock = calculateTotalStock(blockToFind);
    const flow = calculateOneYearFlow(blockToFind);
    const stockToFlow = stock / flow;
    const basePrice = 0.25 * stockToFlow ** 3;
    const confidence = (68 / 100) * basePrice;
    return basePrice - confidence;
  },
  name: "Stock-To-Flow 2024 Refit" as const,
  params: [],
  summary:
    "Price is 0.25 × (stock / one-year flow)^3, with the floor and the ceiling 68% below and above that line.",
});

export default stockToFlowModelNew;
