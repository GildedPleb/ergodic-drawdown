import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Dock } from "../../src/v2/design/primitives/Dock";
import { FanDiamond, GrabPoint } from "../../src/v2/design/primitives/GrabPoint";
import { LedgerRow } from "../../src/v2/design/primitives/LedgerRow";
import { Select } from "../../src/v2/design/primitives/Select";
import { listKey } from "../../src/v2/design/primitives/Select/logic";
import { Slider } from "../../src/v2/design/primitives/Slider";

const html = (el: ReturnType<typeof createElement>): string => renderToStaticMarkup(el);

test("Dock: reserved slots render hidden; only the shown, selected tab is focusable", () => {
  const out = html(
    createElement(Dock, {
      orientation: "row",
      label: "Panes",
      tabs: [
        { id: "models", label: "Models", shown: true },
        { id: "plans", label: "Plans", shown: false },
      ],
      selected: "models",
      search: { label: "Search", shown: false },
      settings: { label: "Settings", shown: false },
    }),
  );
  expect((out.match(/data-shown="false"/g) ?? []).length).toBe(3);
  expect((out.match(/tabindex="0"/g) ?? []).length).toBe(1);
  expect(out.includes('role="tablist"')).toBe(true);
});

test("Slider: role=slider with its range, value and the previous-value tick", () => {
  const out = html(
    createElement(Slider, { label: "Epochs", value: 10, min: 1, max: 100, step: 1 }),
  );
  expect(out.includes('role="slider"')).toBe(true);
  expect(out.includes('aria-valuenow="10"')).toBe(true);
  expect(out.includes("--dyn-was")).toBe(true);
});

test("LedgerRow (§1P/§1MP 7): always live; its label names the value cell; description, then line", () => {
  const out = html(
    createElement(
      LedgerRow,
      { id: "r", label: "Samples", htmlFor: "f", value: "field", description: "What it does." },
      "slider",
    ),
  );
  expect(out.includes('for="f"') && out.includes('id="r-label"')).toBe(true);
  expect(out.indexOf("field") < out.indexOf("What it does.")).toBe(true);
  expect(out.indexOf("What it does.") < out.indexOf("slider</div>")).toBe(true);
  expect(out.includes('role="group" aria-labelledby="r-label"')).toBe(true);
  expect(out.includes("<button")).toBe(false);
  // No htmlFor (a row naming a group, e.g. Colour or Clamp): the label is plain text.
  const plain = html(createElement(LedgerRow, { id: "c", label: "Colour", kind: "pair" }));
  expect(plain.includes("<label")).toBe(false);
  expect(plain.includes('data-kind="pair"')).toBe(true);
});

test("GrabPoint: a named button reporting the sheet's expanded state", () => {
  const out = html(createElement(GrabPoint, { label: "Open", expanded: false }));
  expect(out.includes('aria-label="Open" aria-expanded="false"')).toBe(true);
});

test("1L.1: the fan-diamond's fan opens to the right, rotated in the SVG source (no transform)", () => {
  const out = html(createElement(FanDiamond));
  expect(out.includes("transform")).toBe(false);
  const lines = [
    ...out.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g),
  ].map((m) => m.slice(1).map(Number));
  expect(lines.length).toBe(7);
  // Every fan line starts at the diamond's left point and ends on its right half.
  for (const [x1, y1, x2] of lines) {
    expect([x1, y1]).toEqual([0, 13]);
    expect((x2 ?? 0) >= 13).toBe(true);
  }
  expect(lines.some(([, , x2, y2]) => x2 === 26 && y2 === 13)).toBe(true);
});

const MODELS = [
  "Power Law Regression Median",
  "Power Law Support Line",
  "Rainbow Chart",
  "CAGR",
  "Stock-To-Flow 2024 Refit",
  "Stock-To-Flow",
  "Historic",
];

test("§1MP 6 Select keys, open: ↑↓ move one row without wrapping, Home/End jump, Esc closes", () => {
  const n = MODELS.length;
  expect(listKey(true, 0, n, "ArrowDown")).toEqual({ open: true, active: 1, handled: true });
  expect(listKey(true, 0, n, "ArrowUp").active).toBe(0);
  expect(listKey(true, n - 1, n, "ArrowDown").active).toBe(n - 1);
  expect(listKey(true, 3, n, "Home").active).toBe(0);
  expect(listKey(true, 3, n, "End").active).toBe(n - 1);
  expect(listKey(true, 3, n, "Escape")).toEqual({ open: false, active: 3, handled: true });
  // Enter / Space are the row button's own click; other keys pass through.
  expect(listKey(true, 3, n, "Enter").handled).toBe(false);
  expect(listKey(true, 3, n, "Tab").handled).toBe(false);
  // Closed, the pick is a plain button: no list keys.
  expect(listKey(false, 3, n, "ArrowDown")).toEqual({ open: false, active: 3, handled: false });
});

test("§1MP 6 Select markup: closed, a listbox showing only the pick, its description beneath", () => {
  const out = html(
    createElement(Select, {
      id: "pm",
      labelledBy: "lbl",
      options: MODELS,
      value: "CAGR",
      describe: (o: string) => `about ${o}`,
    }),
  );
  expect(out.includes('id="pm" class')).toBe(true);
  expect(out.includes('role="listbox" aria-labelledby="lbl"')).toBe(true);
  expect(out.includes('role="combobox"')).toBe(false);
  expect((out.match(/role="option"/g) ?? []).length).toBe(1);
  expect(out.includes('id="pm-opt-3"') && out.includes('aria-selected="true" tabindex="0"')).toBe(
    true,
  );
  expect(out.includes(">CAGR<") && out.includes(">about CAGR<")).toBe(true);
  expect(out.includes("data-state")).toBe(false);
  // Named by a plain label when no visible heading does.
  const walk = html(
    createElement(Select, {
      id: "w",
      label: "Walk Strategy:",
      options: ["Bubble", "Saw"],
      value: "Saw",
      describe: () => "",
      columns: true,
    }),
  );
  expect(walk.includes('aria-label="Walk Strategy:"')).toBe(true);
});
