import "./dom-shim.js";

import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "bun:test";

import { narrow, useDependency } from "../src/contexts/computed/hooks/use-dependancy";

let gateRuns = 0;
let midRuns = 0;
let deepRuns = 0;
let holdGate = false;
let releaseHeldGate: ((value: string) => void) | undefined;

let snapshot: {
  deepReady: boolean;
  deepResult: string | null;
  gateResult: string | null;
  midReady: boolean;
  midResult: string | null;
} = {
  deepReady: false,
  deepResult: null,
  gateResult: null,
  midReady: false,
  midResult: null,
};

const reset = (): void => {
  gateRuns = 0;
  midRuns = 0;
  deepRuns = 0;
  holdGate = false;
  releaseHeldGate = undefined;
  snapshot = {
    deepReady: false,
    deepResult: null,
    gateResult: null,
    midReady: false,
    midResult: null,
  };
};

function Chain({ token }: { token: number }) {
  const gate = useDependency(
    "gate",
    (_signal, _hash, _token: number) => {
      gateRuns += 1;
      if (!holdGate) return "Success";
      return new Promise<string>((resolve) => {
        releaseHeldGate = resolve;
      });
    },
    [token],
  );
  const mid = useDependency(
    "mid",
    (_signal, _hash, _value: string) => {
      midRuns += 1;
      return "Success";
    },
    [narrow(gate)],
    [gate],
  );
  const deep = useDependency(
    "deep",
    (_signal, _hash, value: string, step: number) => {
      deepRuns += 1;
      return `${value}:${step}`;
    },
    [narrow(mid), token],
    [mid],
  );
  useEffect(() => {
    snapshot = {
      deepReady: deep.currentHash === deep.lastComputed,
      deepResult: deep.result,
      gateResult: gate.result,
      midReady: mid.currentHash === mid.lastComputed,
      midResult: mid.result,
    };
  });
  return createElement("span");
}

test("a repeated gate result still wakes the next layer", async () => {
  reset();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(createElement(Chain, { token: 1 }));
  });

  expect(gateRuns).toBe(1);
  expect(midRuns).toBe(1);
  expect(deepRuns).toBe(1);
  expect(snapshot).toEqual({
    deepReady: true,
    deepResult: "Success:1",
    gateResult: "Success",
    midReady: true,
    midResult: "Success",
  });

  await act(async () => {
    root.render(createElement(Chain, { token: 2 }));
  });

  expect(gateRuns).toBe(2);
  expect(midRuns).toBe(2);
  expect(deepRuns).toBe(2);
  expect(snapshot).toEqual({
    deepReady: true,
    deepResult: "Success:2",
    gateResult: "Success",
    midReady: true,
    midResult: "Success",
  });

  await act(async () => {
    root.unmount();
  });
});

test("a restored input refills a result cleared by an in-flight compute", async () => {
  reset();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(createElement(Chain, { token: 1 }));
  });

  holdGate = true;
  await act(async () => {
    root.render(createElement(Chain, { token: 2 }));
  });

  expect(gateRuns).toBe(2);
  expect(midRuns).toBe(1);
  expect(snapshot.midReady).toBe(false);
  expect(snapshot.midResult).toBe(null);
  const release = releaseHeldGate;
  if (release === undefined) throw new Error("missing held gate");

  holdGate = false;
  await act(async () => {
    root.render(createElement(Chain, { token: 1 }));
  });

  expect(gateRuns).toBe(2);
  expect(midRuns).toBe(2);
  expect(snapshot).toEqual({
    deepReady: true,
    deepResult: "Success:1",
    gateResult: "Success",
    midReady: true,
    midResult: "Success",
  });

  await act(async () => {
    release("Abandoned");
  });

  expect(gateRuns).toBe(2);
  expect(snapshot).toEqual({
    deepReady: true,
    deepResult: "Success:1",
    gateResult: "Success",
    midReady: true,
    midResult: "Success",
  });

  await act(async () => {
    root.unmount();
  });
});
