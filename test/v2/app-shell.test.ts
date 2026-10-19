import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { Engine } from "../../src/engine/engine";
import { EngineMemory } from "../../src/engine/memory";
import { emptySnapshot } from "../../src/engine/snapshot";
import { EngineProvider } from "../../src/hooks/use-engine";
import { AppShell } from "../../src/v2/app/shell/AppShell";

Object.assign(globalThis, { localStorage: { getItem: () => null, setItem: () => undefined } });

/** An engine that never returns: the shell's empty state. */
const engine: Engine = {
  memory: new EngineMemory(),
  workerCount: 0,
  dispose: () => undefined,
  get: emptySnapshot,
  inputWaves: () => 0,
  notes: () => [],
  runs: () => 0,
  set: () => undefined,
  settled: async () => "quiet",
  subscribe: () => () => undefined,
};
const html = renderToStaticMarkup(
  createElement(EngineProvider, { engine, children: createElement(AppShell) }),
);

test("shell: before the engine returns, the chart is named by the number-free headline", () => {
  expect(html.includes('role="img" aria-label="Bitcoin\u2019s price, across the futures')).toBe(
    true,
  );
});

test("shell: the dock renders five slots, only MODELS shown and selected", () => {
  expect((html.match(/data-shown="false"/g) ?? []).length).toBe(4);
  expect(/aria-selected="true"[^>]*data-shown="true"[^>]*>Models</.test(html)).toBe(true);
});

test("shell: the Models sheet is a region named Models that the tab and grab point control", () => {
  expect(html.includes('id="models-sheet"')).toBe(true);
  expect((html.match(/aria-controls="models-sheet"/g) ?? []).length).toBe(2);
});
