/**
 * V32-BUILD U1 (Undo, keyboard Redo): the step names and values, the keys, the chip's markup and
 * the live-gesture flag that keeps a drag to one step. history.ts's own contract is in
 * undo-history.test.ts.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { createHistory } from "../../src/v2/app/models/history";
import { stepOf } from "../../src/v2/app/models/ModelsSheet";
import {
  choosePatch,
  defaultModelsValues,
  type ModelsValues,
} from "../../src/v2/app/models/values";
import { focusAfter, undoKeyOf } from "../../src/v2/app/shell/panes";
import { strings } from "../../src/v2/app/strings";
import { UndoChip } from "../../src/v2/design/primitives/UndoChip";
import { pickFit, variants } from "../../src/v2/design/primitives/UndoChip/UndoChip";
import { createThrottle } from "../../src/v2/design/primitives/NumberField/throttle";
import { createLive } from "../../src/v2/design/primitives/Slider/live";
import { clock } from "./support/clock";

const base = defaultModelsValues();
const at = (patch: Partial<ModelsValues>): ModelsValues => ({ ...base, ...patch });
const ops = createHistory<ModelsValues>((a, b) => stepOf(a, b) === null);

test("U1: a step names its field and the value it goes to in the field's rest format", () => {
  expect(stepOf(at({ samples: 2500 }), base)).toEqual({
    field: "Statistical Sample Count (1-10k)",
    value: "1,000",
    focus: "#v2-samples",
  });
  expect(stepOf(at({ volatility: 0.5 }), base)?.value).toBe("0.1");
  expect(stepOf(at({ years: 30 }), base)).toEqual({
    field: "Years",
    value: "40",
    focus: "#v2-years",
  });
  expect(stepOf(at({ walk: "Sin" }), base)).toEqual({
    field: "How bumpy the ride is",
    value: "Bubble",
    focus: "#v2-walk",
  });
  expect(stepOf(at({ walk: "Sin" }), at({ walk: "🟢🟢🟢🔴" }))?.value).toBe("🟢🟢🟢🔴");
  expect(stepOf(at({ minMaxMultiple: 5 }), base)).toEqual({
    field: "+/-",
    value: "3",
    focus: "#v2-minmax",
  });
  expect(stepOf(base, at({ clampTop: true }))).toEqual({
    field: "Clamp Price Max",
    value: strings.undo.on,
    focus: '[role="switch"][aria-label="Clamp maximum price"]',
  });
  expect(stepOf(at({ clampBottom: true }), base)).toEqual({
    field: "Clamp Price Min",
    value: strings.undo.off,
    focus: '[role="switch"][aria-label="Clamp minimum price"]',
  });
  expect(stepOf(base, base)).toBe(null);
});

test("U1: a model pick and its variable reset are one step, named by the model", () => {
  const cagr = at(choosePatch("CAGR"));
  expect(cagr.variable === base.variable).toBe(false);
  expect(stepOf(cagr, base)).toEqual({
    field: "How prices grow",
    value: base.model,
    focus: "#v2-model",
  });
  const h = ops.commit(ops.empty, base, cagr);
  expect(h.past).toEqual([base]);
  expect(ops.undo(h, cagr).value).toEqual(base);
  // History spans model switches: CAGR's rate edit, then back across the switch.
  const rate = { ...cagr, variable: 35 };
  const two = ops.commit(h, cagr, rate);
  expect(stepOf(rate, cagr)).toEqual({ field: "R (%)", value: "20", focus: "#v2-variable" });
  const back = ops.undo(two, rate);
  expect(ops.undo(back.history, back.value).value).toEqual(base);
});

const key = (
  k: string,
  mods: Partial<Record<"metaKey" | "ctrlKey" | "shiftKey" | "altKey", boolean>>,
) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});
const at$ = (inText: boolean) => ({ closest: () => (inText ? {} : null) });

test("U1: Cmd/Ctrl+Z undoes and Shift+Cmd/Ctrl+Z redoes, except in a text field", () => {
  expect(undoKeyOf(key("z", { metaKey: true }), at$(false))).toBe("undo");
  expect(undoKeyOf(key("z", { ctrlKey: true }), null)).toBe("undo");
  expect(undoKeyOf(key("Z", { metaKey: true, shiftKey: true }), at$(false))).toBe("redo");
  expect(undoKeyOf(key("z", { ctrlKey: true, shiftKey: true }), at$(false))).toBe("redo");
  expect(undoKeyOf(key("z", { metaKey: true }), at$(true))).toBe(null);
  expect(undoKeyOf(key("Z", { metaKey: true, shiftKey: true }), at$(true))).toBe(null);
  expect(undoKeyOf(key("z", {}), at$(false))).toBe(null);
  expect(undoKeyOf(key("z", { metaKey: true, altKey: true }), at$(false))).toBe(null);
  expect(undoKeyOf(key("y", { metaKey: true }), at$(false))).toBe(null);
});

test("U1 redo: Shift+Cmd+Z re-applies the step undone most recently; a commit clears redo", () => {
  const years = at({ years: 30 });
  const vol = at({ years: 30, volatility: 0.4 });
  let h = ops.commit(ops.commit(ops.empty, base, years), years, vol);
  let value = vol;
  const press = (shift: boolean): void => {
    const way = undoKeyOf(key("z", { metaKey: true, shiftKey: shift }), null);
    if (way === null) return;
    const r = ops[way](h, value);
    h = r.history;
    value = r.value;
  };
  press(false);
  press(false);
  expect(value).toEqual(base);
  press(true);
  expect(value).toEqual(years);
  // Announced like an undo: "<Field> back to <value>".
  const step = stepOf(base, value);
  expect(strings.undo.back(step?.field ?? "", step?.value ?? "")).toBe("Years back to 30");
  h = ops.commit(h, value, at({ years: 30, samples: 10 }));
  value = at({ years: 30, samples: 10 });
  press(true);
  expect(value).toEqual(at({ years: 30, samples: 10 }));
  expect(h.future).toEqual([]);
});

test("U1: the chip is a button named for the step, reading ↶ Undo · <Field>: <old value>", () => {
  const html = renderToStaticMarkup(
    createElement(UndoChip, {
      step: { field: "Years", value: "30" },
      label: strings.undo.label,
      name: strings.undo.name,
      onUndo: () => undefined,
    }),
  );
  expect(html.startsWith('<button type="button"')).toBe(true);
  expect(html.includes('aria-label="Undo, Years back to 30"')).toBe(true);
  expect(html.includes('title="Undo, Years back to 30"')).toBe(true);
  expect(html.includes('data-state="in"')).toBe(true);
  expect(html.includes('d="M5 3 L2 6 L5 9 M2 6 H10 A4 4 0 0 1 10 14 H7"')).toBe(true);
  expect(html.replace(/<[^>]+>/g, "")).toBe("Undo\u00a0·\u00a0Years: 30");
  expect(html.includes("ellipsis") || html.includes("data-fit")).toBe(false);
  expect([...variants.state, ...variants.fit]).toEqual(["in", "out", "value", "word", "glyph"]);
  expect(
    renderToStaticMarkup(
      createElement(UndoChip, {
        step: null,
        label: "Undo",
        name: strings.undo.name,
        onUndo: () => undefined,
      }),
    ),
  ).toBe("");
});

test("U1 :861 (c): the model step reads Undo · How prices grow: <option label>", () => {
  const step = stepOf(at(choosePatch("CAGR")), base);
  expect(step?.field).toBe(strings.sections.grow);
  const html = renderToStaticMarkup(
    createElement(UndoChip, {
      step: { field: step?.field ?? "", value: step?.value ?? "" },
      label: strings.undo.label,
      name: strings.undo.name,
      onUndo: () => undefined,
    }),
  );
  expect(html.replace(/<[^>]+>/g, "")).toBe(`Undo\u00a0·\u00a0How prices grow: ${base.model}`);
  expect(html.includes(`aria-label="Undo, How prices grow back to ${base.model}"`)).toBe(true);
});

test("U1 :861 (d): focus moves only off a focused chip that leaves, whatever undid", () => {
  // onChip: the chip had focus (a press, or a key with focus on it); elsewhere focus stays.
  expect(focusAfter(false, false)).toBe("stay");
  expect(focusAfter(false, true)).toBe("stay");
  expect(focusAfter(true, false)).toBe("stay");
  expect(focusAfter(true, true)).toBe("field");
});

// :861 (a) widths in px at 390/100%: glyph+padding 40, "Undo" 36, " · " 16, field+colon, value.
const wide = (field: number, value: number) => ({
  undefined: 40 + 36 + 16 + field + value,
  value: 40 + 36 + 16 + value,
  word: 40 + 36,
  glyph: 40,
});
const fitIn = (room: number, w: ReturnType<typeof wide>) =>
  pickFit((f) => w[f ?? "undefined"] <= room);

test("U1 :861 (a): too narrow, whole pieces drop (field, value, word) down to the glyph", () => {
  const model = wide(120, 170); // "How prices grow: ", "Power Law Support Line"
  expect(fitIn(560, model)).toBe(undefined);
  expect(fitIn(300, model)).toBe("value"); // "↶ Undo · Power Law Support Line"
  expect(fitIn(200, model)).toBe("word"); // "↶ Undo"
  expect(fitIn(60, model)).toBe("glyph");
  expect(fitIn(0, model)).toBe("glyph");
  // A field never shows without its value, nor a value in part.
  const seen: (string | undefined)[] = [];
  pickFit((f) => {
    seen.push(f);
    return false;
  });
  expect(seen).toEqual([undefined, "value", "word"]);
});

test("U1: the live region's words", () => {
  expect(strings.undo.available).toBe("Undo available");
  expect(strings.undo.back(strings.sections.bumpy, "Bubble")).toBe(
    "How bumpy the ride is back to Bubble",
  );
  expect(strings.undo.name("Clamp Price Max", "on")).toBe("Undo, Clamp Price Max back to on");
  expect(strings.undo.name(strings.sections.bumpy, "Bubble")).toBe(
    "Undo, How bumpy the ride is back to Bubble",
  );
});

test("U1: a held step or a slider drag commits live, and only its release is final (one step)", () => {
  const c = clock();
  const finals: boolean[] = [];
  const hold = createThrottle((final) => finals.push(final), 100, c.timers);
  for (let i = 0; i < 5; i += 1) {
    hold.poke();
    c.advance(60);
  }
  hold.release();
  expect(finals.at(-1)).toBe(true);
  expect(finals.slice(0, -1).every((f) => !f)).toBe(true);

  const d = clock();
  const sent: [number, boolean][] = [];
  let value = 0.1;
  const live = createLive(
    (n, isLive) => sent.push([(value = n), isLive]),
    () => value,
    d.timers,
  );
  live.move(0.2);
  live.move(0.3);
  d.advance(100);
  // The drag ends on the value already sent live: the release still closes the gesture.
  live.release(0.3);
  expect(sent).toEqual([
    [0.2, true],
    [0.3, true],
    [0.3, false],
  ]);
  live.release(0.3);
  expect(sent.length).toBe(3);

  // Live previews push nothing; the final commit pushes one step back to where the drag began.
  let h = ops.empty;
  let now = base;
  for (const [n, isLive] of sent) {
    const next = { ...now, volatility: n };
    h = isLive ? ops.preview(h, now) : ops.commit(h, now, next);
    now = next;
  }
  expect(h.past).toEqual([base]);
});
