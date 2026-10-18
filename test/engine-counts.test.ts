import { expect, test } from "bun:test";

import { createEngine, type Engine } from "../src/engine/engine";
import { inProcessWorker } from "./golden/in-process";
import { engineConfig } from "./engine-fixture";

const finitePrices = (engine: Engine): number[] => {
  const series = engine.memory.simulationData.get(0, 0);
  if (series === undefined) throw new Error("missing price row");
  return [...series].filter((price) => Number.isFinite(price));
};

test("a one by one graph keeps prices and balances non-negative", async () => {
  const engine = createEngine({ worker: inProcessWorker() });
  engine.set(engineConfig());
  expect(await engine.settled()).toBe("quiet");
  const prices = finitePrices(engine);
  expect(prices.length > 0).toBe(true);
  for (const price of prices) expect(price >= 0.01).toBe(true);
  const balance = engine.memory.drawdownData.getRow(0, true);
  if (balance === undefined) throw new Error("missing balance");
  for (const value of balance) {
    if (Number.isFinite(value)) expect(value >= 0).toBe(true);
  }
  expect(engine.get().chartOptions === null).toBe(false);
  expect(engine.get().dataProperties === null).toBe(false);
  expect(engine.get().simulationStats === null).toBe(false);
  engine.dispose();
});

test("growing the sample grid keeps the rows already walked", async () => {
  const engine = createEngine({ worker: inProcessWorker() });
  engine.set(engineConfig({ samples: 3 }));
  expect(await engine.settled()).toBe("quiet");
  const before = finitePrices(engine);
  const noted = engine.notes().length;
  engine.set(engineConfig({ samples: 7 }));
  expect(await engine.settled()).toBe("quiet");
  expect(finitePrices(engine)).toEqual(before);
  const added = engine.notes().slice(noted);
  const simulation = added.filter((note) => note.type === "RUN_PRICE_SIMULATION");
  expect(simulation.length > 0).toBe(true);
  for (const note of simulation) expect(note.startIndex >= 3).toBe(true);
  engine.dispose();
});

test("a render toggle and an identical set add no worker tasks", async () => {
  const engine = createEngine({ worker: inProcessWorker() });
  const config = engineConfig({ samples: 2 });
  engine.set(config);
  expect(await engine.settled()).toBe("quiet");
  const noted = engine.notes().length;
  const waves = engine.inputWaves();
  const walks = engine.runs("Price Walk");
  engine.set({
    ...config,
    render: {
      ...config.render,
      renderPriceWalks: true,
      showHistoric: false,
      renderModelMin: false,
    },
  });
  expect(await engine.settled()).toBe("quiet");
  expect(engine.notes().length).toBe(noted);
  expect(engine.runs("Simulation")).toBe(1);

  engine.set({
    ...config,
    render: {
      ...config.render,
      renderPriceWalks: true,
      showHistoric: false,
      renderModelMin: false,
    },
  });
  expect(await engine.settled()).toBe("quiet");
  expect(engine.inputWaves()).toBe(waves + 1);
  expect(engine.runs("Price Walk")).toBe(walks + 1);
  engine.dispose();
});

test("quantile then normal then quantile runs the quantile kernel once", async () => {
  const engine = createEngine({ worker: inProcessWorker() });
  const config = engineConfig({ distribution: "Quantile", samples: 4 });
  engine.set(config);
  expect(await engine.settled()).toBe("quiet");
  const first = engine.notes().filter((note) => note.type === "RUN_DISTRIBUTION_QUANTILE").length;
  expect(first > 0).toBe(true);

  const normal = {
    ...config,
    render: {
      ...config.render,
      renderDrawdownDistribution: "Normal" as const,
      renderPriceDistribution: "Normal" as const,
    },
  };
  engine.set(normal);
  expect(await engine.settled()).toBe("quiet");
  engine.set(config);
  expect(await engine.settled()).toBe("quiet");
  const roundTrip = engine
    .notes()
    .filter((note) => note.type === "RUN_DISTRIBUTION_QUANTILE").length;
  expect(roundTrip).toBe(first);
  engine.dispose();
});
