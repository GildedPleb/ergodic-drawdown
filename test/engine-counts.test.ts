import { expect, test } from "bun:test";

import type GrowableSharedArray from "../src/classes/growable-shared-array";
import { type WorkerTasks } from "../src/contexts/workers/types";
import { createEngine, type Engine } from "../src/engine/engine";
import { weeksSinceLastHalving } from "../src/halvings";
import { allocatedEpochs, visibleWeeks } from "../src/horizon";
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
  const config = engineConfig({ samples: 3 });
  engine.set(config);
  expect(await engine.settled()).toBe("quiet");
  const before = finitePrices(engine);
  const noted = engine.notes().length;
  engine.set({ ...config, samples: 7 });
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

const markEpochZero = (grid: GrowableSharedArray): number => {
  const cell = grid.get(0, 0);
  if (cell === undefined) throw new Error("missing epoch 0");
  const index = cell.findIndex((value, place) => place < cell.length - 1 && Number.isFinite(value));
  if (index < 0) throw new Error("epoch 0 has no finite week to mark");
  cell[index] = -1;
  return index;
};

test("raising the year past the stored columns keeps the walked weeks", async () => {
  const seen: WorkerTasks[] = [];
  let watchVolume = false;
  let volumeKeptColumn = false;
  const worker = inProcessWorker();
  const run = worker.addTasks;
  worker.addTasks = (tasks, signal, onKernelSettled) => {
    if (watchVolume) {
      for (const task of tasks) {
        if (task.type !== "RUN_VOLUME") continue;
        const { itemLength, sharedBuffer } = task.payload.drawdownExport;
        const last = new Float64Array(sharedBuffer)[itemLength - 1];
        if (last !== 0) volumeKeptColumn = true;
      }
    }
    seen.push(...tasks);
    return run(tasks, signal, onKernelSettled);
  };

  const startYears = 4;
  const engine = createEngine({ worker });
  const config = engineConfig({ samples: 1, years: startYears });
  const weeksSince = weeksSinceLastHalving(config.halvings);
  const startColumns = allocatedEpochs(weeksSince, visibleWeeks(startYears));
  let longer = startYears + 1;
  while (allocatedEpochs(weeksSince, visibleWeeks(longer)) <= startColumns) {
    longer += 1;
    if (longer > 120) throw new Error("horizon never crosses a column");
  }
  const added = visibleWeeks(longer) - visibleWeeks(startYears);

  engine.set(config);
  expect(await engine.settled()).toBe("quiet");
  const priceIndex = markEpochZero(engine.memory.simulationData);
  const balanceIndex = markEpochZero(engine.memory.drawdownData);
  seen.length = 0;
  watchVolume = true;

  engine.set({ ...config, years: longer });
  expect(await engine.settled()).toBe("quiet");
  const keptPrice = engine.memory.simulationData.get(0, 0);
  const keptBalance = engine.memory.drawdownData.get(0, 0);
  expect(keptPrice?.[priceIndex]).toBe(-1);
  expect(keptBalance?.[balanceIndex]).toBe(-1);
  expect(volumeKeptColumn).toBe(true);

  const priceStarts: number[] = [];
  const groupWeeks: number[] = [];
  for (const task of seen) {
    if (task.type === "RUN_PRICE_SIMULATION") {
      const startEpoch = task.payload.task.startEpoch;
      if (startEpoch === undefined) throw new Error("price walk restarted at week 0");
      priceStarts.push(startEpoch);
    }
    if (task.type === "RUN_DISTRIBUTION_GROUP") groupWeeks.push(task.payload.dataLength);
  }
  expect(priceStarts.length > 0).toBe(true);
  for (const start of priceStarts) expect(start > 0).toBe(true);
  expect(groupWeeks.length > 0).toBe(true);
  for (const weeks of groupWeeks) expect(weeks).toBe(added);

  seen.length = 0;
  engine.set({ ...config, currentPrice: config.currentPrice + 1, years: longer });
  expect(await engine.settled()).toBe("quiet");
  const rewrittenPrice = engine.memory.simulationData.get(0, 0);
  const rewrittenBalance = engine.memory.drawdownData.get(0, 0);
  expect(rewrittenPrice?.[priceIndex] === -1).toBe(false);
  expect(rewrittenBalance?.[balanceIndex] === -1).toBe(false);
  let restarted = 0;
  let drawdownGroups = 0;
  for (const task of seen) {
    if (task.type === "RUN_PRICE_SIMULATION") {
      restarted += 1;
      expect(task.payload.task.startEpoch === undefined).toBe(true);
    }
    if (task.type === "RUN_DISTRIBUTION_GROUP" && task.payload.getZero) {
      drawdownGroups += 1;
      expect(task.payload.dataLength).toBe(visibleWeeks(longer));
    }
  }
  expect(restarted > 0).toBe(true);
  expect(drawdownGroups > 0).toBe(true);
  engine.dispose();
});
