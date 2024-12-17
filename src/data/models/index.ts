import cagrModel from "./cagr";
import powerLawModel from "./power-law";
import log10PriceModelConfig from "./power-law-support";
import rainbowChartModel from "./rainbow";
import stockToFlowModel from "./stock-to-flow";
import stockToFlowModelNew from "./stock-to-flow-2024-refit";

export const models = [
  powerLawModel,
  log10PriceModelConfig,
  rainbowChartModel,
  cagrModel,
  stockToFlowModelNew,
  stockToFlowModel,
];

export const modelMap = {
  [cagrModel.modelType]: cagrModel,
  [log10PriceModelConfig.modelType]: log10PriceModelConfig,
  [powerLawModel.modelType]: powerLawModel,
  [rainbowChartModel.modelType]: rainbowChartModel,
  [stockToFlowModel.modelType]: stockToFlowModel,
  [stockToFlowModelNew.modelType]: stockToFlowModelNew,
} as const;
