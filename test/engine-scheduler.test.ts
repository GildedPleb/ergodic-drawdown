import { expect, test } from "bun:test";

import { createGraph, type GraphNode } from "../src/engine/graph-scheduler";

const flush = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

test("a repeated gate result still wakes the next layer", async () => {
  let token = 1;
  let gateRuns = 0;
  let midRuns = 0;
  let deepRuns = 0;
  let gateResult: string | null = null;
  let midResult: string | null = null;
  let deepResult: string | null = null;

  const gate: GraphNode = {
    clear: true,
    clearResult: () => {
      gateResult = null;
    },
    commit: (value) => {
      gateResult = typeof value === "string" ? value : null;
    },
    hasResult: () => gateResult !== null,
    inputs: () => [token],
    name: "gate",
    run: () => {
      gateRuns += 1;
      return "Success";
    },
    watch: [],
  };
  const mid: GraphNode = {
    clear: true,
    clearResult: () => {
      midResult = null;
    },
    commit: (value) => {
      midResult = typeof value === "string" ? value : null;
    },
    hasResult: () => midResult !== null,
    inputs: () => [gateResult],
    name: "mid",
    run: () => {
      midRuns += 1;
      return "Success";
    },
    watch: ["gate"],
  };
  const deep: GraphNode = {
    clear: true,
    clearResult: () => {
      deepResult = null;
    },
    commit: (value) => {
      deepResult = typeof value === "string" ? value : null;
    },
    hasResult: () => deepResult !== null,
    inputs: () => [midResult, token],
    name: "deep",
    run: () => {
      deepRuns += 1;
      return `${midResult ?? ""}:${token}`;
    },
    watch: ["mid"],
  };
  const graph = createGraph([gate, mid, deep], {
    onChange: () => undefined,
    onError: () => undefined,
    onPublished: () => undefined,
  });

  graph.request();
  expect(await graph.settled()).toBe("quiet");
  expect(gateRuns).toBe(1);
  expect(midRuns).toBe(1);
  expect(deepRuns).toBe(1);
  expect(deepResult).toBe("Success:1");

  token = 2;
  graph.request();
  expect(await graph.settled()).toBe("quiet");
  expect(gateRuns).toBe(2);
  expect(midRuns).toBe(2);
  expect(deepRuns).toBe(2);
  expect(deepResult).toBe("Success:2");
  graph.dispose();
});

test("a restored input refills a result cleared by an in-flight compute", async () => {
  let token = 1;
  let hold = false;
  let release: ((value: string) => void) | undefined;
  let gateRuns = 0;
  let midRuns = 0;
  let gateResult: string | null = null;
  let midResult: string | null = null;
  let deepResult: string | null = null;

  const graph = createGraph(
    [
      {
        clear: true,
        clearResult: () => {
          gateResult = null;
        },
        commit: (value) => {
          gateResult = typeof value === "string" ? value : null;
        },
        hasResult: () => gateResult !== null,
        inputs: () => [token],
        name: "gate",
        run: () => {
          gateRuns += 1;
          if (!hold) return "Success";
          return new Promise<string>((resolve) => {
            release = resolve;
          });
        },
        watch: [],
      },
      {
        clear: true,
        clearResult: () => {
          midResult = null;
        },
        commit: (value) => {
          midResult = typeof value === "string" ? value : null;
        },
        hasResult: () => midResult !== null,
        inputs: () => [gateResult],
        name: "mid",
        run: () => {
          midRuns += 1;
          return "Success";
        },
        watch: ["gate"],
      },
      {
        clear: true,
        clearResult: () => {
          deepResult = null;
        },
        commit: (value) => {
          deepResult = typeof value === "string" ? value : null;
        },
        hasResult: () => deepResult !== null,
        inputs: () => [midResult, token],
        name: "deep",
        run: () => `${midResult ?? ""}:${token}`,
        watch: ["mid"],
      },
    ],
    { onChange: () => undefined, onError: () => undefined, onPublished: () => undefined },
  );

  graph.request();
  expect(await graph.settled()).toBe("quiet");

  hold = true;
  token = 2;
  graph.request();
  await flush();
  expect(gateRuns).toBe(2);
  expect(midRuns).toBe(1);
  expect(midResult).toBe(null);

  hold = false;
  token = 1;
  graph.request();
  expect(await graph.settled()).toBe("quiet");
  expect(gateRuns).toBe(2);
  expect(midRuns).toBe(2);
  expect(deepResult).toBe("Success:1");
  expect(gateResult).toBe("Success");

  const finish = release;
  if (finish === undefined) throw new Error("missing held gate");
  finish("Abandoned");
  await flush();
  expect(gateRuns).toBe(2);
  expect(gateResult).toBe("Success");
  expect(deepResult).toBe("Success:1");
  graph.dispose();
});

test("one hundred sets in one turn are one pass", async () => {
  let token = 0;
  let runs = 0;
  let result: string | null = null;
  const graph = createGraph(
    [
      {
        clear: true,
        clearResult: () => {
          result = null;
        },
        commit: (value) => {
          result = typeof value === "string" ? value : null;
        },
        hasResult: () => result !== null,
        inputs: () => [token],
        name: "gate",
        run: () => {
          runs += 1;
          return String(token);
        },
        watch: [],
      },
    ],
    { onChange: () => undefined, onError: () => undefined, onPublished: () => undefined },
  );

  for (let index = 0; index < 100; index++) {
    token = index;
    graph.request();
  }
  expect(await graph.settled()).toBe("quiet");
  expect(graph.inputWaves()).toBe(1);
  expect(runs).toBe(1);
  expect(result).toBe("99");
  graph.dispose();
});

test("an upstream throw does not run dependents", async () => {
  let midRuns = 0;
  const graph = createGraph(
    [
      {
        clear: true,
        clearResult: () => undefined,
        commit: () => undefined,
        hasResult: () => false,
        inputs: () => [1],
        name: "gate",
        run: () => {
          throw new Error("boom");
        },
        watch: [],
      },
      {
        clear: true,
        clearResult: () => undefined,
        commit: () => undefined,
        hasResult: () => false,
        inputs: () => [1],
        name: "mid",
        run: () => {
          midRuns += 1;
          return "Success";
        },
        watch: ["gate"],
      },
    ],
    { onChange: () => undefined, onError: () => undefined, onPublished: () => undefined },
  );
  graph.request();
  expect(await graph.settled()).toBe("quiet");
  expect(midRuns).toBe(0);
  graph.dispose();
});

test("dispose settles an in-flight pass as aborted", async () => {
  let release: ((value: string) => void) | undefined;
  let result: string | null = null;
  const graph = createGraph(
    [
      {
        clear: true,
        clearResult: () => {
          result = null;
        },
        commit: (value) => {
          result = typeof value === "string" ? value : null;
        },
        hasResult: () => result !== null,
        inputs: () => [1],
        name: "gate",
        run: () =>
          new Promise<string>((resolve) => {
            release = resolve;
          }),
        watch: [],
      },
    ],
    { onChange: () => undefined, onError: () => undefined, onPublished: () => undefined },
  );
  graph.request();
  await flush();
  const pending = graph.settled();
  graph.dispose();
  expect(await pending).toBe("aborted");
  release?.("late");
  await flush();
  expect(result).toBe(null);
});
