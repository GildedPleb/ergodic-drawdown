import { expect, test, type Page } from "@playwright/test";

// V32-BUILD RF1 (:865; WCAG 1.4.4, 1.4.10): at 390 wide with a 32px root nothing in the app
// shell is wider than the viewport, and neither script nor focus can scroll it sideways.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    info.project.name !== `${browserName}-390x844` || browserName !== "chromium",
    "390, Chromium",
  );
});

const at32 = async (page: Page, theme: "dark" | "linen" = "dark"): Promise<void> => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.style.fontSize = "32px";
    });
  });
  await page.goto(theme === "linen" ? "/?theme=linen" : "/");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // The dock row shows while the sheet is open.
  await page.locator('[aria-controls="models-sheet"][aria-expanded="false"]').first().click();
  await expect(page.getByRole("tab", { name: "Models" })).toBeVisible();
  await page.waitForTimeout(600);
};

/** Every laid-out element ends inside the viewport (the measuring probes are not layout). */
const overflowing = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > cw + 0.5) {
        const name = el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 24) ?? "";
        out.push(`${el.tagName.toLowerCase()} "${name}" right ${String(Math.round(r.right))}`);
      }
    }
    return out;
  });

/** Every element's sideways scroll offset that isn't 0. */
const shifted = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [document.documentElement, ...document.querySelectorAll("body, body *")]
      .filter((el) => el.scrollLeft !== 0)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className)} ${String(el.scrollLeft)}`),
  );

test("RF1: 390 with a 32px root: nothing past the right edge; a model pick and the gear's focus never scroll the shell", async ({
  page,
}) => {
  await at32(page);
  expect.soft(await overflowing(page)).toEqual([]);
  expect.soft(await shifted(page)).toEqual([]);

  // Bitcoin on shows the model picker.
  const bitcoin = page.locator('#asset-bitcoin[aria-expanded="false"]');
  if ((await bitcoin.count()) > 0) await bitcoin.click();
  const model = page.locator("#v2-model");
  await model.scrollIntoViewIfNeeded();
  const pick = model.locator('[role="option"][aria-selected="false"]').first();
  if (!(await pick.isVisible())) await model.click();
  await pick.click();
  await page.waitForTimeout(400);
  expect(await shifted(page)).toEqual([]);

  // ⚙ is a reserved slot (visibility:hidden, so not focusable) until settings ship: show it as it
  // will ship, then focus it and scroll it into view the way script would.
  const gear = page.locator('[aria-label="Settings"]');
  await gear.evaluate((el) => {
    el.dataset["shown"] = "true";
    el.tabIndex = 0;
  });
  await gear.focus();
  await expect(gear).toBeFocused();
  await gear.evaluate((el) => {
    el.scrollIntoView({ inline: "end" });
  });
  await page.waitForTimeout(200);
  expect(await shifted(page)).toEqual([]);
  // ⚙ is pinned at the inline end of the tab row, on screen; the tabs keep their words.
  const g = await gear.boundingBox();
  const row = await page.locator('[role="tablist"]').boundingBox();
  expect(g !== null && row !== null && g.x >= row.x + row.width - 0.5).toBe(true);
  expect(g !== null && g.x + g.width <= 390).toBe(true);
  await expect(page.getByRole("tab", { name: "Models" })).toHaveText("Models");
  expect(await overflowing(page)).toEqual([]);
});

for (const theme of ["dark", "linen"] as const) {
  test(`RF1 200% text baselines (${theme}): header and dock row`, async ({ page }) => {
    await at32(page, theme);
    await expect(page.locator("header")).toHaveScreenshot(`rf1-header--text200--${theme}.png`);
    await expect(page.locator('[role="tablist"]').locator("..")).toHaveScreenshot(
      `rf1-dock--text200--${theme}.png`,
    );
  });
}

type Box = { x: number; y: number; width: number; height: number };
const box = async (page: Page, selector: string): Promise<Box> => {
  const b = await page.locator(selector).boundingBox();
  if (b === null) throw new Error(`${selector} has no box`);
  return b;
};

// RF1 clause 5 (:865, review of 4190c67): the reserved (hidden) slots never make a row of their
// own, so there is no empty row under MODELS; a shown ⚙ sits on the tab row; the tabs keep their
// 16px alignment: the three slots in order on one line, centred together, MODELS the first.
test("RF1.5: 390 with a 32px root: one tab row, no gap row above Bitcoin, ⚙ on the tab row, MODELS aligned as at 16px", async ({
  page,
}) => {
  await at32(page);
  const models = await box(page, "#tab-models");
  const plans = await box(page, "#tab-plans");
  const stats = await box(page, "#tab-stats");
  const list = await box(page, '[role="tablist"]');
  // One row: the tablist is MODELS' height and every slot shares MODELS' top.
  expect.soft(Math.round(list.height)).toBe(Math.round(models.height));
  expect.soft([plans.y, stats.y].map((y) => Math.round(y - models.y))).toEqual([0, 0]);
  // Bitcoin follows the tab row at the 16px distance scaled ×2 (26px → 52px), not a row later.
  const bitcoin = await box(page, "#asset-bitcoin");
  expect.soft(bitcoin.y - (models.y + models.height)).toBeLessThanOrEqual(52.5);
  // The 16px rule: the slot group is centred (equal space either side), MODELS starts it.
  const before = models.x - list.x;
  const after = list.x + list.width - (stats.x + stats.width);
  expect.soft(Math.abs(before - after)).toBeLessThanOrEqual(0.5);
  expect.soft(models.x <= plans.x && plans.x <= stats.x).toBe(true);

  // A shown ⚙ shares the tab row: its centre is MODELS' centre, ±1px.
  const gear = page.locator('[aria-label="Settings"]');
  await gear.evaluate((el) => {
    el.dataset["shown"] = "true";
  });
  const g = await box(page, '[aria-label="Settings"]');
  const m = await box(page, "#tab-models");
  expect(Math.abs(g.y + g.height / 2 - (m.y + m.height / 2))).toBeLessThanOrEqual(1);
});
