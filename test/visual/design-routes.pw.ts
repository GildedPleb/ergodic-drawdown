import { expect, test } from "@playwright/test";

// Probe m3: with the flag on, every /design path is the design route (index, story or
// "No story"), never the production app.
test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== `${browserName}-1440x900`, "runs once per engine");
});

test("bare /design and /design/ show the story index, not the app", async ({ page }) => {
  for (const path of ["/design", "/design/"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Design stories" })).toBeVisible();
    await expect(page.getByRole("link", { name: "models-pane/linen" })).toBeVisible();
    await expect(page.locator("#v2-model")).toHaveCount(0);
  }
});

test("unknown and too-deep paths say No story", async ({ page }) => {
  for (const path of ["/design/nope", "/design/a/b/c", "/design/select/default/extra"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("No story");
    await expect(page.locator("#v2-model")).toHaveCount(0);
  }
});

test("models-pane/linen themes <html> linen", async ({ page }) => {
  await page.goto("/design/models-pane/linen");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "linen");
  await expect(page.locator("#v2-model")).toBeVisible();
});
