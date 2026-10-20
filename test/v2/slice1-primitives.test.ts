import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Dock } from "../../src/v2/design/primitives/Dock";
import { FanDiamond, GrabPoint } from "../../src/v2/design/primitives/GrabPoint";
import { LedgerRow } from "../../src/v2/design/primitives/LedgerRow";
import { Select } from "../../src/v2/design/primitives/Select";
import {
  closedState,
  listPlace,
  lockWhileOpen,
  placeList,
  selectKey,
  type SelectState,
  TYPEAHEAD_MS,
} from "../../src/v2/design/primitives/Select/logic";
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

test("LedgerRow (§1P): always live, its label names the value cell; no button, no edit mode", () => {
  const out = html(createElement(LedgerRow, { id: "r", label: "Samples", htmlFor: "f" }, "field"));
  expect(out.includes('for="f"') && out.includes("field</div>")).toBe(true);
  expect(out.includes("<button")).toBe(false);
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

/** Walk keys from a state; returns the last state and every commit. */
const walk = (
  keys: Array<string | [string, { altKey?: boolean }]>,
  selected = 0,
  start: SelectState = closedState(selected),
  t0 = 0,
): { s: SelectState; commits: number[]; handled: boolean[] } => {
  let s = start;
  const commits: number[] = [];
  const handled: boolean[] = [];
  keys.forEach((k, i) => {
    const [key, mods] = typeof k === "string" ? [k, {}] : k;
    const step = selectKey(s, { key, ...mods }, MODELS, selected, t0 + i * 100);
    s = step.state;
    handled.push(step.handled);
    if (step.commit !== undefined) commits.push(step.commit);
  });
  return { s, commits, handled };
};

test("1L.3 Select keys, closed: ↓/Enter/Space open on the value; ↑/Home first; End last", () => {
  for (const key of ["ArrowDown", "Enter", " "])
    expect(walk([key], 3).s).toEqual({ ...closedState(3), open: true });
  expect(walk(["ArrowUp"], 3).s.active).toBe(0);
  expect(walk([["ArrowUp", { altKey: true }]], 3).s.active).toBe(3);
  expect(walk(["Home"], 3).s.active).toBe(0);
  expect(walk(["End"], 3).s.active).toBe(6);
  expect(walk(["x"], 3).s.open).toBe(true);
  expect(walk(["Tab"], 3).handled).toEqual([false]);
});

test("1L.3 Select keys, open: ↑↓ move without wrapping, Home/End, PageUp/PageDown, Enter picks", () => {
  expect(walk(["ArrowDown", "ArrowDown", "ArrowDown", "Enter"], 0).commits).toEqual([2]);
  expect(walk(["ArrowDown", "ArrowUp", "ArrowUp", "ArrowUp"], 0).s.active).toBe(0);
  expect(walk(["End", "ArrowDown", "ArrowDown"], 0).s.active).toBe(6);
  expect(walk(["ArrowDown", "PageDown"], 0).s.active).toBe(6);
  expect(walk(["End", "PageUp"], 0).s.active).toBe(0);
  expect(walk(["ArrowDown", "End", "Home", " "], 2).commits).toEqual([0]);
  expect(walk(["ArrowDown", "ArrowDown", ["ArrowUp", { altKey: true }]], 1).commits).toEqual([2]);
});

test("1L.3 Select keys: Esc closes with no change; Tab picks and lets focus move on", () => {
  const esc = walk(["ArrowDown", "ArrowDown", "Escape"], 1);
  expect(esc.commits).toEqual([]);
  expect(esc.s).toEqual(closedState(1));
  const tab = walk(["ArrowDown", "ArrowDown", "Tab"], 1);
  expect(tab.commits).toEqual([2]);
  expect(tab.handled.at(-1)).toBe(false);
  expect(tab.s.open).toBe(false);
});

test("1L.3 Select type-ahead: a prefix jumps, a repeated key cycles, 500ms resets the buffer", () => {
  // "s" then "t" → "st" → Stock-To-Flow 2024 Refit (the first match from the value).
  expect(walk(["ArrowDown", "s", "t"], 0).s.active).toBe(4);
  // "p" "p" cycles the two Power Law models from the current one.
  expect(walk(["ArrowDown", "p"], 0).s.active).toBe(1);
  expect(walk(["ArrowDown", "p", "p"], 0).s.active).toBe(0);
  expect(walk(["ArrowDown", "c"], 0).s.active).toBe(3);
  // A pause longer than 500ms starts a new buffer.
  let s = selectKey(closedState(0), { key: "h" }, MODELS, 0, 0).state;
  expect(s.active).toBe(6);
  s = selectKey(s, { key: "r" }, MODELS, 0, TYPEAHEAD_MS + 1).state;
  expect(s.active).toBe(2);
  // Space inside a typed prefix is a character ("stock-to-flow 2…"), not a pick.
  expect(
    walk(["ArrowDown", "s", "t", "o", "c", "k", "-", "t", "o", "-", "f", "l", "o", "w", " "], 0)
      .commits,
  ).toEqual([]);
  expect(walk(["ArrowDown", "z"], 2).s.active).toBe(2);
});

test("1U Select placement: every row when it fits (below first, then above); else whole rows", () => {
  // Fits below: all rows, no scroll, however many (8 or fewer is every engine list today).
  expect(placeList(400, 100, 44, 7)).toEqual({ up: false, maxHeight: 308 });
  expect(placeList(352, 0, 44, 8)).toEqual({ up: false, maxHeight: 352 });
  // Only fits above.
  expect(placeList(100, 400, 44, 7)).toEqual({ up: true, maxHeight: 308 });
  // The frame (borders) counts: 8 rows + 3px only fit above here.
  expect(placeList(353, 400, 44, 8, 3)).toEqual({ up: true, maxHeight: 355 });
  // Fits neither way: the roomier side, cut to whole rows (never a half row), frame kept.
  expect(placeList(100, 200, 44, 9)).toEqual({ up: true, maxHeight: 176 });
  expect(placeList(150, 120, 44, 9, 3)).toEqual({ up: false, maxHeight: 135 });
  // Never less than one row.
  expect(placeList(10, 5, 44, 9)).toEqual({ up: false, maxHeight: 44 });
});

test("1L.3 Select markup: a select-only combobox (APG) naming its listbox; options are the names", () => {
  const out = html(
    createElement(Select, { id: "pm", labelledBy: "lbl", options: MODELS, value: "CAGR" }),
  );
  expect(out.includes('role="combobox"')).toBe(true);
  expect(out.includes('aria-haspopup="listbox"')).toBe(true);
  expect(out.includes('aria-expanded="false"')).toBe(true);
  expect(out.includes('aria-controls="pm-list"')).toBe(true);
  expect(out.includes('aria-labelledby="lbl"')).toBe(true);
  expect(out.includes('tabindex="0"')).toBe(true);
  expect(out.includes("aria-activedescendant")).toBe(false);
  expect((out.match(/role="option"/g) ?? []).length).toBe(7);
  const names = [
    ...out.matchAll(/role="option"[^>]*>(?:<span[^>]*><\/span>)?<span[^>]*>(.*?)<\/span>/g),
  ].map((m) => m[1]);
  expect(names).toEqual(MODELS);
  expect(out.includes('id="pm-opt-3" aria-selected="true"')).toBe(true);
});

test("1U Select box: flush under the field when it fits, flush above it otherwise; field width", () => {
  const field = { top: 561, bottom: 605, left: 12, width: 366 };
  expect(listPlace(field, 844, 44, 7, 4)).toEqual({
    up: true,
    maxHeight: 312,
    x: 12,
    y: 249,
    w: 366,
  });
  expect(listPlace({ ...field, top: 100, bottom: 144 }, 844, 44, 7, 4)).toEqual({
    up: false,
    maxHeight: 312,
    x: 12,
    y: 144,
    w: 366,
  });
});

test("1U Select lock: outside wheel/touch-move stopped and close; outside scroll, resize close", () => {
  const doc = new EventTarget();
  const win = new EventTarget();
  let inList = false;
  let closes = 0;
  const detach = lockWhileOpen(
    doc,
    win,
    () => inList,
    () => {
      closes += 1;
    },
  );
  const wheel = new Event("wheel", { cancelable: true });
  doc.dispatchEvent(wheel);
  expect([wheel.defaultPrevented, closes]).toEqual([true, 1]);
  inList = true;
  const own = new Event("touchmove", { cancelable: true });
  doc.dispatchEvent(own);
  doc.dispatchEvent(new Event("scroll"));
  expect([own.defaultPrevented, closes]).toEqual([false, 1]);
  inList = false;
  doc.dispatchEvent(new Event("scroll"));
  win.dispatchEvent(new Event("resize"));
  expect(closes).toBe(3);
  detach();
  doc.dispatchEvent(new Event("wheel", { cancelable: true }));
  win.dispatchEvent(new Event("resize"));
  expect(closes).toBe(3);
});
