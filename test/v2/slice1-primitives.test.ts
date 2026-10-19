import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Dock } from "../../src/v2/design/primitives/Dock";
import { GrabPoint } from "../../src/v2/design/primitives/GrabPoint";
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
