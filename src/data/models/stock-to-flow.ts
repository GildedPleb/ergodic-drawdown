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

const stockToFlowModel = defineModel({
  description:
    "Stock is the coins issued through the block this week lands on, and flow is the coins issued over the prior year of blocks. The coefficients and the 65% band are fixed. This model has no setting.",
  maxPrice: ({ currentBlock, week }): number => {
    const blockToFind = currentBlock + week * BLOCKS_PER_WEEK;
    const stock = calculateTotalStock(blockToFind);
    const flow = calculateOneYearFlow(blockToFind);
    const stockToFlow = stock / flow;
    const basePrice = Math.exp(-1.02) * stockToFlow ** 3.08;
    const confidence = (65 / 100) * basePrice;
    return basePrice + confidence;
  },
  minPrice: ({ currentBlock, week }): number => {
    const blockToFind = currentBlock + week * BLOCKS_PER_WEEK;
    const stock = calculateTotalStock(blockToFind);
    const flow = calculateOneYearFlow(blockToFind);
    const stockToFlow = stock / flow;
    const basePrice = Math.exp(-1.02) * stockToFlow ** 3.08;
    const confidence = (65 / 100) * basePrice;
    return basePrice - confidence;
  },
  name: "Stock-To-Flow" as const,
  params: [],
  summary:
    "Price is exp(−1.02) × (stock / one-year flow)^3.08, with the floor and the ceiling 65% below and above that line.",
});

export default stockToFlowModel;
