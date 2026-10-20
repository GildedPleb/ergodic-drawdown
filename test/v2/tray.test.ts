import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { ModelsSheet, type ModelsSheetProps } from "../../src/v2/app/models/ModelsSheet";
import { defaultModelsValues, type ModelsValues } from "../../src/v2/app/models/values";
import { strings } from "../../src/v2/app/strings";

const render = (
  patch: Partial<ModelsValues> = {},
  props: Partial<Omit<ModelsSheetProps, "values" | "onChange">> = {},
): string =>
  renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: { ...defaultModelsValues(), ...patch },
      onChange: () => undefined,
      ...props,
    }),
  );
const open = render;

/** The element that opens with `<tag ... id="id"` up to its closing `</tag>` (no nesting of tag). */
const tagWith = (html: string, attr: string): string => {
  const at = html.indexOf(attr);
  const start = html.lastIndexOf("<", at);
  return html.slice(start, html.indexOf(">", at) + 1);
};

test("1N strings: a tray is named for its choice", () => {
  expect(strings.models.settings("CAGR")).toBe("CAGR settings");
});

test("1N groups: left-aligned group labels; the engine's label names the walk Select", () => {
  const html = render({ model: "CAGR" });
  expect(html.includes('data-level="section"')).toBe(false);
  expect((html.match(/data-level="group"/g) ?? []).length >= 3).toBe(true);
  expect(html.includes(">Walk Strategy:<")).toBe(true); // the Select's own (hidden) label
  expect(/data-level="group"[^>]*>(?:(?!<\/div>).)*Walk Strategy:/.test(html)).toBe(false);
});

test("1N tray: CAGR's fields hang in the model Select's tray, labelled '<choice> settings'", () => {
  const html = open({ model: "CAGR" });
  const tray = tagWith(html, 'id="v2-model-tray"');
  expect(tray.includes('role="group"') && tray.includes('aria-label="CAGR settings"')).toBe(true);
  const combo = tagWith(html, 'id="v2-model"');
  expect(combo.includes('aria-controls="v2-model-list v2-model-tray"')).toBe(true);
  const trayAt = html.indexOf('id="v2-model-tray"');
  expect(html.indexOf('id="row-variable"') > trayAt).toBe(true);
  expect(html.indexOf('id="row-minmax"') > trayAt).toBe(true);
  expect(html.indexOf('id="v2-walk"') > html.indexOf('id="row-minmax"')).toBe(true);
});

test("1N tray: a choice with no fields draws no tray; Historic gets just its one field", () => {
  const plain = open();
  expect(plain.includes('id="v2-model-tray"')).toBe(false);
  expect(tagWith(plain, 'id="v2-model"').includes('aria-controls="v2-model-list"')).toBe(true);
  const historic = open({ model: "Historic" });
  expect(tagWith(historic, 'id="v2-model-tray"').includes('aria-label="Historic settings"')).toBe(
    true,
  );
  expect(historic.includes('id="row-minmax"')).toBe(false);
});

test("1N tray: every walk's fields live in the walk Select's tray", () => {
  for (const [walk, said] of [
    ["Bubble", "Bubble"],
    ["Saw", "Saw"],
    ["\u{1F7E2}\u{1F7E2}\u{1F7E2}\u{1F534}", "3 up, 1 down"],
  ] as const) {
    const html = open({ walk });
    const trayAt = html.indexOf('id="v2-walk-tray"');
    expect(tagWith(html, 'id="v2-walk-tray"').includes(`aria-label="${said} settings"`)).toBe(true);
    expect(tagWith(html, 'id="v2-walk"').includes("v2-walk-tray")).toBe(true);
    expect(html.indexOf('id="row-volatility"') > trayAt).toBe(true);
    expect(html.indexOf('role="switch"', trayAt) > trayAt).toBe(true);
  }
});

test("1N in place: the value cell becomes the input; no second box, no duplicate value", () => {
  const html = open({ model: "CAGR", variable: 20 }, { initialEditing: "variable" });
  const start = html.indexOf('id="row-variable-editor"');
  expect(start > 0).toBe(true);
  const row = html.slice(html.lastIndexOf("<div", start), html.indexOf('id="row-minmax"'));
  expect(row.includes('id="v2-variable"')).toBe(true);
  // The value appears once: as the input's value, never also as text beside it.
  expect((row.match(/>20</g) ?? []).length).toBe(0);
  expect((row.match(/value="20"/g) ?? []).length).toBe(1);
  expect(html.includes('id="row-variable"')).toBe(false);
});
