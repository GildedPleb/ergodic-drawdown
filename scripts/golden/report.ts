export interface RuntimeMeasure {
  bubbleLastPrice: number;
  hashDefaultChangeMs: number;
  hashWideChangeMs: number;
  quantileMs: number;
  quantileSum: number;
  sharkLastPrice: number;
  simulationBubbleMs: number;
  simulationSharkMs: number;
}

export interface BenchFile {
  protocol: string;
  runs: Partial<Record<"bun" | "node", RuntimeMeasure>>;
}

const PROTOCOL =
  "3 warmups, median of 15. Kernels are one thread, 1000 samples × 10 epochs, volatility 0.1, seed 1, Power Law bounds. Each kernel sample clears the grid first, because a filled cell is skipped.";

const ms = (value: number | undefined, digits = 1): string => {
  if (value === undefined) return "not run";
  const factor = 10 ** digits;
  return `${(Math.round(value * factor) / factor).toFixed(digits)} ms`;
};

const num = (value: number | undefined): string =>
  value === undefined ? "not run" : String(value);

const cell = (run: RuntimeMeasure | undefined, key: keyof RuntimeMeasure, digits = 1): string =>
  run === undefined ? "not run" : ms(run[key], digits);

export const measuredMarkdown = (bench: BenchFile): string => {
  const bun = bench.runs.bun;
  const node = bench.runs.node;
  return `# Measured

Printed by \`bun run golden\`. The earlier column is the spec's measurement and stays. This-run columns are filled when that runtime is measured on this machine. The surgery adds an engine column here. It does not remove the earlier column.

Kernel protocol: ${PROTOCOL}

## Kernels

| Kernel | Earlier Node | Earlier Bun | This Node | This Bun |
| --- | --- | --- | --- | --- |
| Simulation, Bubble, 1000×10 | 151.2 ms at 59eda15 | 59.5 ms at 59eda15 | ${cell(node, "simulationBubbleMs")} | ${cell(bun, "simulationBubbleMs")} |
| Simulation, Shark, 1000×10 | 152.0 ms at 59eda15 | 69.0 ms at 59eda15 | ${cell(node, "simulationSharkMs")} | ${cell(bun, "simulationSharkMs")} |
| Quantile, 1000×10 | 116.4 ms at 59eda15, before the scratch list | 189.4 ms at 59eda15, before the scratch list | ${cell(node, "quantileMs")} | ${cell(bun, "quantileMs")} |

Surgery target for these rows: stay within 10% of the this-run median above.

## In the app

Chrome preview, read before 59eda15. This command does not launch a browser. The live surface is the one-line wave log: slowest step first, 0.1 ms resolution, flushed 100 ms after the last step.

| Step | Earlier |
| --- | --- |
| Simulation | 66.8 ms |
| Price Distribution | 59.4 ms |

## Graph bookkeeping

Earlier is the whole provider at ea77773, including 10–11 renders per change (162–189 µs each). This run is only the item-list hashing those renders do: \`hash-sum\` of each reoccurring item and each one-off item, for drawdown static and chart options, repeated 11 times. Defaults are 1 reoccurring item. The wide case is 50 + 50.

| Change | Earlier total | Earlier hashing | This run, list hashing, Bun | This run, list hashing, Node |
| --- | --- | --- | --- | --- |
| Defaults | 6.0–10.1 ms | 2.9–4.9 ms | ${cell(bun, "hashDefaultChangeMs", 2)} | ${cell(node, "hashDefaultChangeMs", 2)} |
| 50+50 items | 16.7–20.3 ms | 14.0–16.4 ms | ${cell(bun, "hashWideChangeMs", 2)} | ${cell(node, "hashWideChangeMs", 2)} |

Surgery target for the whole engine pass, not this microbench: ≤ 0.5 ms per change at defaults, ≤ 1 ms at 50+50 items. Main-thread engine work at defaults is observed against 16 ms. That 16 ms figure was not measured in the spec.

## Memory

Calculated for 1000 samples × 10 epochs. Price and balance are 208 floats per cell. Walk state is 3 floats per cell.

| Grid | Bytes | MB |
| --- | --- | --- |
| Price | 16,640,000 | 16.64 |
| Walk state | 240,000 | 0.24 |
| Balance | 16,640,000 | 16.64 |

## Checksums

Last price of the last sample, and the sum of the quantile buffer. Node and Bun can differ. A zero tail means the kernel did not walk.

| Check | This Node | This Bun |
| --- | --- | --- |
| Bubble last price | ${num(node?.bubbleLastPrice)} | ${num(bun?.bubbleLastPrice)} |
| Shark last price | ${num(node?.sharkLastPrice)} | ${num(bun?.sharkLastPrice)} |
| Quantile sum | ${num(node?.quantileSum)} | ${num(bun?.quantileSum)} |
`;
};
