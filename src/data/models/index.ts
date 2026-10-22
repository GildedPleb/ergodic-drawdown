import { type ModelNames, type ModelSettings } from "../../types";
import cagrModel from "./cagr";
import historic from "./historic";
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
  historic,
];

export const modelMap = {
  [cagrModel.name]: cagrModel,
  [historic.name]: historic,
  [log10PriceModelConfig.name]: log10PriceModelConfig,
  [powerLawModel.name]: powerLawModel,
  [rainbowChartModel.name]: rainbowChartModel,
  [stockToFlowModel.name]: stockToFlowModel,
  [stockToFlowModelNew.name]: stockToFlowModelNew,
} as const;

export const isModelName = (value: string): value is keyof typeof modelMap =>
  Object.prototype.hasOwnProperty.call(modelMap, value);

/** One model's settings, in param order. A value of the param's kind wins; otherwise the default. */
export const declaredSettings = (name: ModelNames, values?: ModelSettings): ModelSettings => {
  const settings: { [key: string]: number | string } = {};
  for (const param of modelMap[name].params) {
    const value = values?.[param.key];
    switch (param.kind) {
      case "number":
        settings[param.key] = typeof value === "number" ? value : param.default;
        break;
      case "choice":
        settings[param.key] = typeof value === "string" ? value : param.default;
        break;
      default: {
        const unreachable: never = param;
        throw new Error(`unknown setting kind: ${String(unreachable)}`);
      }
    }
  }
  return settings;
};

/** Version-1 files still store these two keys. A model that does not declare one keeps the old default. */
export const savedKnobs = (
  settings: ModelSettings,
): { minMaxMultiple: number; variable: number } => ({
  minMaxMultiple: typeof settings["minMaxMultiple"] === "number" ? settings["minMaxMultiple"] : 3,
  variable: typeof settings["variable"] === "number" ? settings["variable"] : 0,
});
