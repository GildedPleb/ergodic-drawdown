import marketData from "./bitcoin_weekly_prices_transformed_2.json";

export const marketDataset = {
  borderColor: "rgb(246, 145, 50)",
  borderWidth: 0.5,
  data: marketData,
  label: `Bitcoin Historic Price`,
  parsing: false,
  pointRadius: 0,
  tension: 0,
};
