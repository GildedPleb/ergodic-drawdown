import { expect, test } from "@playwright/test";

test("tick-toggle default story renders", async ({ page }) => {
  await page.goto("/design/tick-toggle");
  await expect(page.getByRole("switch")).toBeVisible();
});
