# Measured

Printed by `bun run golden`. The earlier column is the spec's measurement and stays. This-run columns are filled when that runtime is measured on this machine. The surgery adds an engine column here. It does not remove the earlier column.

Kernel protocol: 3 warmups, median of 15. Kernels are one thread, 1000 samples × 10 epochs, volatility 0.1, seed 1, Power Law bounds. Each kernel sample clears the grid first, because a filled cell is skipped.

## Kernels

| Kernel | Earlier Node | Earlier Bun | This Node | This Bun |
| --- | --- | --- | --- | --- |
| Simulation, Bubble, 1000×10 | 151.2 ms at 59eda15 | 59.5 ms at 59eda15 | 36.6 ms | 24.0 ms |
| Simulation, Shark, 1000×10 | 152.0 ms at 59eda15 | 69.0 ms at 59eda15 | 36.7 ms | 23.8 ms |
| Quantile, 1000×10 | 116.4 ms at 59eda15, before the scratch list | 189.4 ms at 59eda15, before the scratch list | 54.3 ms | 40.3 ms |

Surgery target for these rows: stay within 10% of the this-run median above.

## In the app

Chrome preview, read before 59eda15. This command does not launch a browser. The live surface is the one-line wave log: slowest step first, 0.1 ms resolution, flushed 100 ms after the last step.

| Step | Earlier |
| --- | --- |
| Simulation | 66.8 ms |
| Price Distribution | 59.4 ms |

## Graph bookkeeping

Earlier is the whole provider at ea77773, including 10–11 renders per change (162–189 µs each). This run is only the item-list hashing those renders do: `hash-sum` of each reoccurring item and each one-off item, for drawdown static and chart options, repeated 11 times. Defaults are 1 reoccurring item. The wide case is 50 + 50.

| Change | Earlier total | Earlier hashing | This run, list hashing, Bun | This run, list hashing, Node |
| --- | --- | --- | --- | --- |
| Defaults | 6.0–10.1 ms | 2.9–4.9 ms | 0.04 ms | 0.06 ms |
| 50+50 items | 16.7–20.3 ms | 14.0–16.4 ms | 4.36 ms | 4.90 ms |

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
| Bubble last price | 68549145.6338708 | 68549145.63387094 |
| Shark last price | 89538006.89075482 | 89538006.89075482 |
| Quantile sum | 356947211751.9044 | 356947211751.9044 |
