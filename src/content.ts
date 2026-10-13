export const inputLabels = {
  clamp: "Clamp Price:",
  clampBottom: "Min",
  clampTop: "Max",
  distributions: "Distribution:",
  drawdownDate: "Starts:",
  epoch: "Epoch Count (1-30):",
  historic: "Historic Price",
  inflation: "Inflation:",
  model: "Model:",
  renderDrawdown: "Walks",
  renderExpenses: "Expenses:",
  renderModelMax: "Max:",
  renderModelMin: "Min:",
  renderNormal: "Std Dev:",
  renderQuantile: "Quantile:",
  renderWalk: "Walks",
  renderWalkQuantile: "Quantile:",
  samples: "Statistical Sample Count (1k-10k):",
  samplesToRender: "Walk count:",
  showResults: "Results",
  totalBitcoin: "Bitcoin:",
  vol: "Volatility (0-1):",
  walk: "Walk Strategy:",
};

export const fieldLabels = {
  drawdown: "Drawdown",
  graph: "Visualization",
  model: "Model",
  price: "Price",
  render: "Render",
};

export const bitcoinColor = "rgb(246, 145, 50)";

export const distributions = ["Normal", "Quantile", "None"] as const;
