import { expect, test } from "bun:test";

import { createEngine } from "../src/engine/engine";
import { resolvePoolCount } from "../src/engine/pool/worker-pool";
import { inProcessWorker } from "./golden/in-process";
import { engineConfig } from "./engine-fixture";

test("pool count zero falls back to four workers", () => {
  expect(resolvePoolCount(0)).toBe(4);
  expect(resolvePoolCount(1)).toBe(1);
  expect(resolvePoolCount(8)).toBe(8);
  const hardware = navigator.hardwareConcurrency;
  expect(resolvePoolCount(undefined)).toBe(hardware === 0 ? 4 : hardware);
});

test("show model, no bands, and zero items still settle", async () => {
  const engine = createEngine({ worker: inProcessWorker() });
  engine.set(
    engineConfig({
      distribution: "None",
      items: false,
      showModel: true,
    }),
  );
  expect(await engine.settled()).toBe("quiet");
  expect(engine.get().errors).toEqual({});
  expect(engine.get().volumeStats).toEqual({ average: 0, median: 0 });
  expect(engine.get().chartOptions === null).toBe(false);
  const bands = engine.get().dataProperties?.datasets ?? [];
  expect(bands.length > 0).toBe(true);
  engine.dispose();
});

test("dispose during a run settles aborted and drops the late result", async () => {
  const engine = createEngine({ worker: inProcessWorker() });
  engine.set(engineConfig());
  const pending = engine.settled();
  engine.dispose();
  expect(await pending).toBe("aborted");
  expect(engine.get().simulationStats).toBe(null);
});

test("an in-process engine reports its worker count", () => {
  const engine = createEngine({ worker: inProcessWorker(1) });
  expect(engine.workerCount).toBe(1);
  engine.dispose();
});
