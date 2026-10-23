import memoize from "memoizee";

import { BLOCKS_PER_WEEK, BLOCKS_PER_YEAR, HALVING_INTERVAL } from "../../constants";
import { defineModel } from "./define";

const defaultBand = 0.68;

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

const bandWidth = (band: number): number => (band >= 0 && band <= 0.99 ? band : defaultBand);

const centerPrice = (blockNumber: number, formula: string): number => {
  const stock = calculateTotalStock(blockNumber);
  const flow = calculateOneYearFlow(blockNumber);
  const stockToFlow = stock / flow;
  if (formula === "2024") return 0.25 * stockToFlow ** 3;
  if (formula === "s2fx") return (Math.exp(12.7598) * stockToFlow ** 4.1167) / stock;
  return Math.exp(-1.02) * stockToFlow ** 3.08;
};

const edgedPrice = (
  blockNumber: number,
  formula: string,
  band: number,
  ceiling: boolean,
): number => {
  const center = centerPrice(blockNumber, formula);
  const confidence = bandWidth(band) * center;
  return ceiling ? center + confidence : center - confidence;
};

const stockToFlowModel = defineModel({
  description:
    "Stock is the coins issued through the block this week lands on, and flow is the coins issued over the prior year of blocks. Original is exp(−1.02) × (stock / one-year flow)^3.08. The 2024 refit is 0.25 × (stock / one-year flow)^3. S2FX is the market value exp(12.7598) × (stock / one-year flow)^4.1167 from PlanB's Stock-to-Flow Cross Asset model of 27 April 2020, divided by that stock. Band is the fraction of the selected center removed from the floor and added to the ceiling. It defaults to 0.68, steps by 0.01, and runs from 0 through 0.99. A stored width outside that range is read as 0.68.",
  maxPrice: ({ currentBlock, settings, week }): number => {
    return edgedPrice(currentBlock + week * BLOCKS_PER_WEEK, settings.formula, settings.band, true);
  },
  minPrice: ({ currentBlock, settings, week }): number => {
    return edgedPrice(
      currentBlock + week * BLOCKS_PER_WEEK,
      settings.formula,
      settings.band,
      false,
    );
  },
  name: "Stock-to-Flow" as const,
  params: [
    {
      default: "original",
      key: "formula",
      kind: "choice",
      label: "Formula",
      options: [
        { label: "Original", value: "original" },
        { label: "2024 refit", value: "2024" },
        { label: "S2FX", value: "s2fx" },
      ],
    },
    {
      default: defaultBand,
      key: "band",
      kind: "number",
      label: "Band",
      max: 0.99,
      min: 0,
      step: 0.01,
    },
  ],
  summary:
    "Formula defaults to Original, and Band defaults to 0.68, the fraction of that center taken off the floor and added to the ceiling.",
});

export default stockToFlowModel;
