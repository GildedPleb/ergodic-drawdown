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

test("1L.2: the sheet body is three panes, Models first; Plans and Stats keep their room, hidden", () => {
  const panes = [...html.matchAll(/data-pane="(\w+)"/g)].map((m) => m[1]);
  expect(panes).toEqual(["models", "plans", "stats"]);
  expect((html.match(/data-pane="(?:plans|stats)" aria-hidden="true"/g) ?? []).length).toBe(2);
  // Inside Models the three sections stack (no inner columns any more).
  expect(html.includes("data-layout=")).toBe(false);
});

test("1L.2: Models is the active pane: its tab selected, its layer on the chart", () => {
  expect(html.includes('data-active-pane="models"')).toBe(true);
  expect(html.includes('data-layer-pane="models"')).toBe(true);
});

test("1L.6: the sheet is edge to edge; only its content is inset, plus the safe area", async () => {
  const { file } = await import("bun");
  const css = await file(`${import.meta.dir}/../../src/v2/app/shell/AppShell.module.css`).text();
  const space = await file(`${import.meta.dir}/../../src/v2/design/tokens/space.css`).text();
  // No gutter around the sheet at any size.
  const dock = [...css.matchAll(/\.dockArea \{([^}]*)\}/g)].map((m) => m[1] ?? "");
  expect(dock.some((d) => /padding(-inline)?: var\(--shell/.test(d))).toBe(false);
  // Each content padding adds the notch's safe area on the screen-edge sides.
  for (const [token, sides] of [
    ["--sheet-pad-phone", ["right", "bottom", "left"]],
    ["--sheet-pad", ["right", "bottom", "left"]],
    ["--panel-pad", ["top", "right", "bottom"]],
    ["--rail-pad", ["top", "right", "bottom"]],
  ] as const) {
    const value = new RegExp(`${token}:([^;]*);`).exec(space)?.[1] ?? "";
    expect(sides.map((s) => value.includes(`env(safe-area-inset-${s}`))).toEqual(
      sides.map(() => true),
    );
  }
});
