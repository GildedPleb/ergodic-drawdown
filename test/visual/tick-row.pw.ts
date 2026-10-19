import { expect, test } from "@playwright/test";

import { gotoStory } from "./checks";

// Interaction runs once per engine; the matrix spec covers every viewport.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    info.project.name !== `${browserName}-1024x768`,
    "interaction runs on one viewport per engine",
  );
});

test("click, Space and Enter each toggle the switch", async ({ page }) => {
  await gotoStory(page, "tick-row/default");
  const sw = page.getByRole("switch");
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.press("Space");
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await sw.press("Enter");
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect(sw).toContainText("ON");
});

test("FL-001: a held Enter (auto-repeat) toggles once", async ({ page }) => {
  await gotoStory(page, "tick-row/default");
  const sw = page.getByRole("switch");
  await sw.focus();
  // After the first down, further downs on a held key are sent with repeat=true. An even count
  // matters: an unguarded button toggles on every keydown and would land back on "false".
  for (let i = 0; i < 20; i += 1) await page.keyboard.down("Enter");
  await page.keyboard.up("Enter");
  await expect(sw).toHaveAttribute("aria-checked", "true");
});

test("FL-001: a held Space toggles once", async ({ page }) => {
  await gotoStory(page, "tick-row/default");
  const sw = page.getByRole("switch");
  await sw.focus();
  for (let i = 0; i < 20; i += 1) await page.keyboard.down(" ");
  await page.keyboard.up(" ");
  await expect(sw).toHaveAttribute("aria-checked", "true");
});

test("FL-001: a held pointer toggles once", async ({ page }) => {
  await gotoStory(page, "tick-row/default");
  const sw = page.getByRole("switch");
  const box = await sw.boundingBox();
  if (box === null) throw new Error("switch not laid out");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1000);
  await page.mouse.up();
  await expect(sw).toHaveAttribute("aria-checked", "true");
});

test("disabled does not toggle", async ({ page }) => {
  await gotoStory(page, "tick-row/disabled");
  const sw = page.getByRole("switch");
  await sw.click({ force: true });
  await expect(sw).toHaveAttribute("aria-checked", "false");
});

test("/design/tick-row/<state> deep links resolve; unknown ids say No story", async ({ page }) => {
  await gotoStory(page, "tick-row/on");
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await page.goto("/design/tick-row/nope");
  await expect(page.getByText("No story: tick-row/nope")).toBeVisible();
});

test("linen story themes <html>, not a box on a dark page", async ({ page }) => {
  await gotoStory(page, "tick-row/linen");
  expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe("linen");
});
