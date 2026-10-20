import { expect, type Page, test } from "@playwright/test";

import { gotoStory } from "./checks";

// Probe M3 / FL-001 on the real Models pane, once per engine at 1440×900, with §1P live fields:
// a held arrow commits once on release; the wheel does nothing unless the field is focused, and
// then commits once when it settles; an out-of-range entry clamps with a visible message; text
// that isn't a number is the invalid state and settles back (no NaN, no silent 1e9 → 1).
test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== `${browserName}-1440x900`, "runs once per engine");
});

const pick = async (page: Page, id: string, option: string): Promise<void> => {
  await page.locator(id).click();
  await page.getByRole("option", { name: option, exact: true }).click();
};

test("held ArrowUp steps the draft and commits once on release", async ({ page }) => {
  await gotoStory(page, "models-sheet/default");
  const epochs = page.locator("#v2-epochs");
  const hint = page.locator("#v2-epochs-hint");
  await epochs.focus();
  for (let i = 0; i < 16; i += 1) await page.keyboard.down("ArrowUp"); // held: draft only
  await expect(epochs).toHaveValue("26");
  await expect(hint).toHaveText("(~40 years)");
  await page.keyboard.up("ArrowUp");
  await expect(hint).toHaveText("(~104 years)");
  // Steps stop at the field's max (30).
  for (let i = 0; i < 20; i += 1) await page.keyboard.down("ArrowUp");
  await page.keyboard.up("ArrowUp");
  await expect(epochs).toHaveValue("30");
});

test("the wheel does nothing unless the field is focused, then commits once it settles", async ({
  page,
}) => {
  await gotoStory(page, "models-sheet/default");
  const vol = page.locator("#v2-vol");
  await vol.hover();
  for (let i = 0; i < 5; i += 1) await page.mouse.wheel(0, -100);
  await expect(vol).toHaveValue("0.1");
  await vol.focus();
  for (let i = 0; i < 5; i += 1) await page.mouse.wheel(0, -100);
  await expect(vol).toHaveValue("0.125");
});

for (const [id, typed, used, message] of [
  ["#v2-samples", "1000000000", "10000", "We used 10,000."],
  ["#v2-samples", "-1", "1", "We used 1."],
  ["#v2-vol", "1e9", "1", "We used 1."],
  ["#v2-vol", "-1", "0", "We used 0."],
  ["#v2-epochs", "1e9", "30", "We used 30."],
  ["#v2-epochs", "-4", "1", "We used 1."],
] as const) {
  test(`${id} "${typed}" clamps to ${used} with a visible message`, async ({ page }) => {
    await gotoStory(page, "models-sheet/default");
    const field = page.locator(id);
    await field.fill(typed);
    await field.press("Enter");
    await expect(field).toHaveValue(used);
    await expect(page.locator(`${id}-message`)).toContainText(message);
    await expect(page.locator("#v2-epochs-hint")).not.toContainText("NaN");
  });
}

test("text that isn't a number is the defined invalid state; the last value stays in use", async ({
  page,
}) => {
  await gotoStory(page, "models-sheet/default");
  const field = page.locator("#v2-vol");
  await field.fill("abc");
  await field.press("Enter");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#v2-vol-message")).toContainText("0.1, is still in use");
  await field.blur();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#v2-epochs-hint")).not.toContainText("NaN");
  // Fixing the text clears it.
  await field.fill("0.2");
  await field.press("Enter");
  await expect(field).not.toHaveAttribute("aria-invalid", "true");
});

test("Form N1: the variable follows each model's own range across Historic → CAGR → Historic", async ({
  page,
}) => {
  await gotoStory(page, "models-sheet/default");
  const variable = page.locator("#v2-variable");
  await pick(page, "#v2-model", "Historic");
  await expect(variable).toHaveValue("2");
  await variable.fill("3");
  await variable.press("Enter");
  await expect(variable).toHaveValue("3");
  await pick(page, "#v2-model", "CAGR");
  await expect(variable).toHaveValue("20");
  await variable.fill("75");
  await variable.press("Enter");
  await expect(variable).toHaveValue("75");
  await pick(page, "#v2-model", "Historic");
  await expect(variable).toHaveValue("2");
});
