import { expect, test } from "@playwright/test";

import { gotoStory } from "./checks";

// Form M8: document.fonts.load/check drive the fonts-failed state. With every woff2 blocked, an
// amount must switch to "BTC 13.1" (never ₿ in a fallback face); with fonts served, ₿ stays.
test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== `${browserName}-1440x900`, "runs once per engine");
});

test("blocked woff2 files flip amounts to the BTC fallback", async ({ page }) => {
  await page.route("**/*.woff2", (route) => route.abort());
  await gotoStory(page, "amount/default");
  await expect(page.locator("html")).toHaveAttribute("data-fonts", "failed", { timeout: 6000 });
  const shown = page.locator("main [aria-hidden='true']").first();
  await expect(shown).toHaveText("BTC\u00A013.1");
  await expect(page.locator("main")).not.toContainText("₿");
  // The accessible name never changes with the display.
  await expect(page.getByText("bitcoin 13.1")).toHaveCount(1);
});

test("served fonts keep the ₿ prefix", async ({ page }) => {
  await gotoStory(page, "amount/default");
  await expect(page.locator("html")).toHaveAttribute("data-fonts", "ok", { timeout: 6000 });
  await expect(page.locator("main [aria-hidden='true']").first()).toHaveText("₿13.1");
});
