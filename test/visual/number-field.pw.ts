import { expect, test } from "@playwright/test";

import { gotoStory } from "./checks";

// Probe M3 / FL-001 on the real Models pane, once per engine at 1440×900: a held arrow commits
// once on release, the wheel never changes a value, and extreme typed values are rejected with
// the invalid state and settle back to main's value (no "(~NaN years)").
test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== `${browserName}-1440x900`, "runs once per engine");
});

test("held ArrowUp steps the draft and commits once on release", async ({ page }) => {
  await gotoStory(page, "models-pane/default");
  const epochs = page.locator("#v2-epochs");
  const hint = page.locator("#v2-epochs-hint");
  await epochs.focus();
  await page.keyboard.down("ArrowUp"); // first press commits 11
  await expect(hint).toHaveText("(~44 years)");
  for (let i = 0; i < 15; i += 1) await page.keyboard.down("ArrowUp"); // repeats: draft only
  await expect(epochs).toHaveValue("26");
  await expect(hint).toHaveText("(~44 years)");
  await page.keyboard.up("ArrowUp");
  await expect(hint).toHaveText("(~104 years)");
  // Steps stop at the field's max (30), as main's spinner does.
  for (let i = 0; i < 20; i += 1) await page.keyboard.down("ArrowUp");
  await page.keyboard.up("ArrowUp");
  await expect(epochs).toHaveValue("30");
});

test("the wheel over a focused field changes nothing", async ({ page }) => {
  await gotoStory(page, "models-pane/default");
  const vol = page.locator("#v2-vol");
  await vol.focus();
  await vol.hover();
  for (let i = 0; i < 5; i += 1) await page.mouse.wheel(0, -100);
  await expect(vol).toHaveValue("0.1");
});

for (const [id, typed, settled] of [
  ["#v2-samples", "1000000000", "1000"],
  ["#v2-samples", "-1", "1000"],
  ["#v2-vol", "1e9", "0.1"],
  ["#v2-vol", "-1", "0.1"],
  ["#v2-epochs", "1e9", "10"],
  ["#v2-epochs", "-4", "10"],
] as const) {
  test(`${id} "${typed}" is invalid with a message, then settles to ${settled}`, async ({
    page,
  }) => {
    await gotoStory(page, "models-pane/default");
    const field = page.locator(id);
    await field.fill(typed);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(`${id}-error`)).toContainText("is still in use");
    await field.blur();
    await expect(field).toHaveValue(settled);
    await expect(field).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#v2-epochs-hint")).toHaveText("(~40 years)");
  });
}

test("blank samples settle to main's 1000; Historic halvings stay in 2–3", async ({ page }) => {
  await gotoStory(page, "models-pane/default");
  const samples = page.locator("#v2-samples");
  await samples.fill("");
  await samples.blur();
  await expect(samples).toHaveValue("1000");
  await page.locator("#v2-model").selectOption("Historic");
  const halvings = page.locator("#v2-variable");
  await expect(halvings).toHaveValue("2");
  await halvings.fill("4");
  await expect(halvings).toHaveValue("2");
  await halvings.fill("3");
  await expect(halvings).toHaveValue("3");
});

test("Form N1: the variable follows each model's own range across Historic → CAGR → Historic", async ({
  page,
}) => {
  await gotoStory(page, "models-pane/default");
  const model = page.locator("#v2-model");
  const variable = page.locator("#v2-variable");
  await model.selectOption("Historic");
  await variable.fill("5");
  await expect(variable).toHaveValue("2");
  await model.selectOption("CAGR");
  await expect(variable).toHaveValue("50");
  await variable.fill("75");
  await expect(variable).toHaveValue("75");
  await variable.fill("0");
  await expect(variable).toHaveValue("0");
  await model.selectOption("Historic");
  await expect(variable).toHaveValue("2");
  for (const typed of ["5", "9"]) {
    await variable.fill(typed);
    await expect(variable).toHaveValue("2");
  }
  await variable.fill("3");
  await expect(variable).toHaveValue("3");
});
