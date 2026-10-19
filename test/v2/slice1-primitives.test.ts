import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Dock } from "../../src/v2/design/primitives/Dock";
import { FanDiamond, GrabPoint } from "../../src/v2/design/primitives/GrabPoint";
import { LedgerRow } from "../../src/v2/design/primitives/LedgerRow";
import { RadioList } from "../../src/v2/design/primitives/RadioList";
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

test("RadioList: one radio per option, the value checked and in the tab order", () => {
  const out = html(
    createElement(RadioList, { labelledBy: "l", options: ["A", "B", "C"], value: "B" }),
  );
  expect((out.match(/role="radio"/g) ?? []).length).toBe(3);
  expect(/aria-checked="true" tabindex="0"[^>]*data-state="on"/.test(out)).toBe(true);
});

test("Slider: role=slider with its range, value and the previous-value tick", () => {
  const out = html(
    createElement(Slider, { label: "Epochs", value: 10, min: 1, max: 100, step: 1 }),
  );
  expect(out.includes('role="slider"')).toBe(true);
  expect(out.includes('aria-valuenow="10"')).toBe(true);
  expect(out.includes("--dyn-was")).toBe(true);
});

test("LedgerRow: the editor is in place only when open", () => {
  const props = { id: "r", label: "Samples", value: "1,000", onToggle: () => undefined };
  const closed = html(createElement(LedgerRow, { ...props, open: false }, "editor"));
  const open = html(createElement(LedgerRow, { ...props, open: true }, "editor"));
  expect([closed.includes("editor</div>"), open.includes("editor</div>")]).toEqual([false, true]);
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
