import { dependencyObjectSymbol, fastCustomHashSum, type DependencyView } from "./hash";

const WAVE_QUIET_MS = 100;
const waveSteps: { ms: number; name: string }[] = [];
let waveTimer: ReturnType<typeof setTimeout> | undefined;

const tenth = (ms: number): string => (Math.round(ms * 10) / 10).toFixed(1);

const flushWave = (): void => {
  waveTimer = undefined;
  const steps = waveSteps.splice(0);
  const slow = steps.filter((step) => step.ms >= 0.1).toSorted((left, right) => right.ms - left.ms);
  const quiet = steps.length - slow.length;
  const parts = slow.map((step) => `${step.name} ${tenth(step.ms)}ms`);
  if (quiet > 0) parts.push(`${quiet} under 0.1ms`);
  if (parts.length > 0) console.log(parts.join(" · "));
};

const recordStep = (name: string, ms: number): void => {
  waveSteps.push({ ms, name });
  if (waveTimer !== undefined) clearTimeout(waveTimer);
  waveTimer = setTimeout(flushWave, WAVE_QUIET_MS);
};

export interface GraphNode {
  readonly clear: boolean;
  readonly name: string;
  readonly watch: readonly string[];
  clearResult(): void;
  commit(value: unknown): void;
  hasResult(): boolean;
  inputs(): readonly unknown[];
  run(signal: AbortSignal, hash: string): unknown;
}

interface Runtime {
  computingHash: string | null;
  controller: AbortController | null;
  currentHash: string;
  lastComputed: string;
  request: symbol | null;
  runs: number;
  spec: GraphNode;
}

export interface Graph {
  currentHash(name: string): string;
  dispose(): void;
  inputWaves(): number;
  request(): void;
  runs(name: string): number;
  settled(): Promise<"aborted" | "quiet">;
}

export const createGraph = (
  specs: readonly GraphNode[],
  hooks: {
    onChange: () => void;
    onError: (name: string, error: unknown) => void;
    onPublished: (name: string) => void;
  },
): Graph => {
  const nodes: Runtime[] = specs.map((spec) => ({
    computingHash: null,
    controller: null,
    currentHash: "",
    lastComputed: "",
    request: null,
    runs: 0,
    spec,
  }));
  const byName = new Map(nodes.map((node) => [node.spec.name, node]));
  for (const node of nodes) {
    for (const watch of node.spec.watch) {
      if (!byName.has(watch)) throw new Error(`${node.spec.name} watches missing ${watch}`);
    }
  }

  let disposed = false;
  let inputWaveCount = 0;
  let queued = false;
  const waiters: ((status: "aborted" | "quiet") => void)[] = [];

  const view = (name: string): DependencyView => {
    const node = byName.get(name);
    if (node === undefined) throw new Error(`missing node ${name}`);
    return {
      currentHash: node.currentHash,
      [dependencyObjectSymbol]: true,
      lastComputed: node.lastComputed,
      name,
    };
  };

  const busy = (): boolean => queued || nodes.some((node) => node.computingHash !== null);

  const checkQuiet = (): void => {
    if (busy() || waiters.length === 0) return;
    const status = disposed ? "aborted" : "quiet";
    const pending = waiters.splice(0);
    for (const waiter of pending) waiter(status);
  };

  const schedule = (): void => {
    if (disposed || queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (disposed) {
        checkQuiet();
        return;
      }
      runPass();
    });
  };

  const begin = (node: Runtime): void => {
    const request = Symbol();
    node.request = request;
    node.computingHash = node.currentHash;
    const controller = new AbortController();
    node.controller = controller;
    const hash = node.currentHash;
    const started = performance.now();
    node.runs += 1;

    void (async () => {
      try {
        const result = await node.spec.run(controller.signal, hash);
        if (result === undefined) {
          throw new Error(`Result can not be undefined: change the ${node.spec.name} call`);
        }
        if (!controller.signal.aborted && node.request === request) {
          node.lastComputed = hash;
          node.spec.commit(result);
          node.computingHash = null;
          if (node.controller === controller) node.controller = null;
          hooks.onPublished(node.spec.name);
          hooks.onChange();
          schedule();
        } else {
          console.log(
            node.spec.name,
            `Compute ended for ${hash} ${controller.signal.aborted ? "on abort." : "on invalid compute."}`,
          );
        }
      } catch (error) {
        if (!controller.signal.aborted && node.request === request) {
          console.error(`Error in compute for ${node.spec.name}:`, error);
          hooks.onError(node.spec.name, error);
          hooks.onChange();
        } else {
          console.warn(
            node.spec.name,
            `Compute failed for ${hash} ${controller.signal.aborted ? "on abort." : "on invalid compute."}`,
          );
        }
      } finally {
        if (node.request === request && !controller.signal.aborted) {
          node.computingHash = null;
          // Successful gate work still arms a timer. Aborting clears it.
          controller.abort();
          if (node.controller === controller) node.controller = null;
        }
        recordStep(node.spec.name, performance.now() - started);
        checkQuiet();
      }
    })();
  };

  const runPass = (): void => {
    if (disposed) return;
    for (const node of nodes) {
      node.currentHash = fastCustomHashSum([
        ...node.spec.inputs(),
        ...node.spec.watch.map((name) => view(name)),
      ]);
    }

    for (const node of nodes) {
      if (node.computingHash !== null && node.computingHash !== node.currentHash) {
        node.controller?.abort();
        node.controller = null;
        node.computingHash = null;
      }

      if (node.lastComputed === node.currentHash && node.spec.hasResult()) continue;
      if (node.computingHash === node.currentHash) continue;

      const waiting = node.spec.watch.filter((name) => {
        const dep = byName.get(name);
        return dep !== undefined && dep.currentHash !== dep.lastComputed;
      });
      if (waiting.length > 0) {
        if (node.spec.clear && node.spec.hasResult()) {
          node.spec.clearResult();
          hooks.onChange();
        }
        continue;
      }

      begin(node);
    }
    checkQuiet();
  };

  return {
    currentHash: (name) => {
      const node = byName.get(name);
      if (node === undefined) throw new Error(`missing node ${name}`);
      return node.currentHash;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const node of nodes) {
        node.request = null;
        node.computingHash = null;
        node.controller?.abort();
        node.controller = null;
      }
      const pending = waiters.splice(0);
      for (const waiter of pending) waiter("aborted");
    },
    inputWaves: () => inputWaveCount,
    request: () => {
      if (disposed) return;
      if (!queued) inputWaveCount += 1;
      schedule();
    },
    runs: (name) => {
      const node = byName.get(name);
      if (node === undefined) throw new Error(`missing node ${name}`);
      return node.runs;
    },
    settled: () => {
      if (disposed) return Promise.resolve("aborted");
      if (!busy()) return Promise.resolve("quiet");
      return new Promise((resolve) => {
        waiters.push(resolve);
      });
    },
  };
};
