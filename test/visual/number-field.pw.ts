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
  // §1MP: tapping the pick opens the checked list; tapping a row picks it.
  await page.locator(`${id} [aria-selected="true"]`).click();
  await page.locator(`${id} [role=option]`).filter({ hasText: option }).first().click();
};

test("held ArrowUp steps the draft and commits once on release", async ({ page }) => {
  await gotoStory(page, "models-sheet/default");
  const years = page.locator("#v2-years");
  await years.focus();
  for (let i = 0; i < 16; i += 1) await page.keyboard.down("ArrowUp"); // held: draft only
  await expect(years).toHaveValue("56");
  await page.keyboard.up("ArrowUp");
  await expect(years).toHaveValue("56");
  // Steps stop at the field's max (main's 120 with no live cap in the story).
  for (let i = 0; i < 80; i += 1) await page.keyboard.down("ArrowUp");
  await page.keyboard.up("ArrowUp");
  await expect(years).toHaveValue("120");
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
  ["#v2-samples", "1000000000", "10000", "Max is 10,000"],
  ["#v2-samples", "-1", "1", "Min is 1"],
  ["#v2-vol", "1e9", "1", "Max is 1"],
  ["#v2-vol", "-1", "0", "Min is 0"],
  ["#v2-years", "1e9", "120", "Max is 120"],
  ["#v2-years", "-4", "1", "Min is 1"],
  ["#v2-samples", "1e309", "10000", "Max is 10,000"], // Form 2j: overflow clamps too
] as const) {
  test(`${id} "${typed}" clamps to ${used} with a visible message`, async ({ page }) => {
    await gotoStory(page, "models-sheet/default");
    const field = page.locator(id);
    await field.fill(typed);
    await field.press("Enter");
    await expect(field).toHaveValue(used);
    await expect(page.locator(`${id}-message`)).toContainText(message);
    await expect(page.locator("[data-pane], body").first()).not.toContainText("NaN");
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
  await expect(page.locator("#v2-vol-message")).toHaveText("Numbers only"); // Form 2j
  await expect(field).toHaveValue("abc"); // Form 2m: Enter keeps the typed text to fix
  await field.blur();
  // Form 2i: the field shows the last committed value again; the note stays.
  await expect(field).toHaveValue("0.1");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#v2-vol-message")).toHaveText("Numbers only");
  await expect(page.locator("[data-pane], body").first()).not.toContainText("NaN");
  // Fixing the text clears it.
  await field.fill("0.2");
  await field.press("Enter");
  await expect(field).not.toHaveAttribute("aria-invalid", "true");
});

test("Form 2l: empty says 'Enter a number' and blur reverts to the value in use", async ({
  page,
}) => {
  await gotoStory(page, "models-sheet/default");
  const vol = page.locator("#v2-vol");
  await vol.fill("   ");
  await vol.press("Enter");
  await expect(page.locator("#v2-vol-message")).toHaveText("Enter a number");
  await vol.blur();
  await expect(vol).toHaveValue("0.1");
  await expect(page.locator("#v2-vol-message")).toHaveText("Enter a number");
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
