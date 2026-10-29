/**
 * G12 against main's model code (not against v2's copy of it):
 * (a) main's models, walks and provider defaults re-dump to the committed golden;
 * (b) every golden setting has a Models-pane control with the same limits and default;
 * (c) v2's engine scenario carries the settings main's code declares for each model.
 * The golden changes only in the merge commit that brings main in (scripts/v2/main-models-golden.ts).
 */
import { file } from "bun";
import { expect, test } from "bun:test";

import { dumpMainModels } from "./support/main-models";
import { NOT_SHOWN, scenarioDiffs, settingDiffs } from "./support/settings-parity";

const golden: unknown = JSON.parse(await file(`${import.meta.dir}/main-models.golden.json`).text());

test("G12 (a): main's models, walks and defaults re-dump to main-models.golden.json", () => {
  expect(dumpMainModels()).toEqual(golden);
});

test("G12 (b): every golden setting has a data-setting control with main's min, max, step, options and default", () => {
  expect(settingDiffs(golden)).toEqual([]);
});

test("G12 (b): every setting the pane hides cites a Form ruling (open ones are questions for Form)", () => {
  expect(Object.keys(NOT_SHOWN).toSorted()).toEqual([
    "loadingPriceData",
    "pinnedWeeks",
    "showModel",
  ]);
});

test("G12 (c): v2's engine scenario equals main's declared settings for every model", () => {
  expect(scenarioDiffs()).toEqual([]);
});
