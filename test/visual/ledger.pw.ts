import { mkdirSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// V32-BUILD §1M (asset ledger) as amended by §1V, in the app.
const SIZES = ["390x844", "1440x900"] as const;
const SHOTS = "/workspace/forge-slice1/1M";
const LOGO = '[aria-controls="models-sheet"]:not([role="tab"])';

test.beforeEach(({ browserName }, info) => {
  test.skip(
    !SIZES.some((s) => info.project.name === `${browserName}-${s}`),
    "ledger checks run at 390x844 and 1440x900",
  );
});

const openSheet = async (page: Page): Promise<void> => {
  await page.locator(LOGO).focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("[data-sheet]")).toHaveAttribute("data-sheet", "half");
  await page.waitForTimeout(300);
};

const fresh = async (page: Page): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("stackmath.v2.models");
  });
  await page.reload();
  await openSheet(page);
};

const header = (page: Page, id: string) => page.locator(`#asset-${id}`);
const expanded = async (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll('[role="listitem"] > div > button[aria-expanded="true"]')].map(
      (b) => b.id,
    ),
  );

const pickCagr = async (page: Page): Promise<void> => {
  await page.locator("#v2-model").click();
  await page.locator('#v2-model-list [role="option"]', { hasText: "CAGR" }).click();
  await expect(page.locator("#v2-model")).toContainText("CAGR");
};

test("§1M/§1V: lands closed, header only; one row open at a time; stand-ins open too", async ({
  page,
}, info) => {
  await fresh(page);
  await expect(page.locator('[role="list"][aria-label="Assets"] > [role="listitem"]')).toHaveCount(
    3,
  );
  expect(await expanded(page)).toEqual([]);
  await expect(page.locator("#v2-model")).toHaveCount(0);
  const theme = info.project.name.startsWith("chromium");
  if (theme) mkdirSync(SHOTS, { recursive: true });
  const size = info.project.name.replace(/^\w+-/, "");
  if (theme) await page.screenshot({ path: `${SHOTS}/${size}-collapsed.png` });
  await header(page, "bitcoin").click();
  expect(await expanded(page)).toEqual(["asset-bitcoin"]);
  await expect(header(page, "bitcoin")).toContainText("Bitcoin \u00B7 price model");
  await expect(page.locator("#v2-model")).toBeVisible();
  // The others fall back muted.
  const colours = await page.evaluate(() =>
    ["bitcoin", "sp"].map((id) => {
      const el = document.querySelector(`[data-asset="${id}"] button`);
      return el === null ? "" : getComputedStyle(el).color;
    }),
  );
  expect(colours[0]).not.toBe(colours[1]);
  await page.waitForTimeout(300); // the 200ms open
  if (theme) await page.screenshot({ path: `${SHOTS}/${size}-bitcoin-open.png` });
  await header(page, "sp").click();
  expect(await expanded(page)).toEqual(["asset-sp"]);
  await expect(page.locator("#v2-model")).toHaveCount(0);
  await expect(page.locator("#asset-sp-body")).toHaveText(
    "S&P isn\u2019t modelled yet. When it is, its settings will open here.",
  );
  await expect(
    page.locator('[data-asset="sp"] [role="switch"], [data-asset="sp"] [aria-pressed]'),
  ).toHaveCount(0);
  await page.waitForTimeout(300);
  if (theme) await page.screenshot({ path: `${SHOTS}/${size}-sp-open.png` });
  await header(page, "inflation").click();
  expect(await expanded(page)).toEqual(["asset-inflation"]);
  const axe = await new AxeBuilder({ page }).include("#models-sheet").analyze();
  expect(axe.violations).toEqual([]);
});

test("§1V: every close path keeps the settings and updates the summary", async ({ page }) => {
  await fresh(page);
  const bitcoin = header(page, "bitcoin");
  // 1. The header again.
  await bitcoin.click();
  await pickCagr(page);
  await bitcoin.click();
  expect(await expanded(page)).toEqual([]);
  await expect(bitcoin).toContainText("CAGR 20% \u00B7 Bubble \u00B7 1,000 futures");
  // 2. Esc (focus back on the header; the sheet stays open).
  await bitcoin.click();
  await page.locator("#v2-variable").fill("28");
  await page.locator("#v2-variable").press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.locator("#v2-variable")).toHaveCount(0);
  await expect(bitcoin).toBeFocused();
  await expect(page.locator("[data-sheet]")).toHaveAttribute("data-sheet", "half");
  await expect(bitcoin).toContainText("CAGR 28% \u00B7");
  // 3. Opening another row.
  await bitcoin.click();
  await header(page, "sp").click();
  expect(await expanded(page)).toEqual(["asset-sp"]);
  await header(page, "sp").click();
  // 4. A press in the sheet outside the row.
  await bitcoin.click();
  // The sheet's own padding beside the ledger: in the sheet, outside the row, not a grab strip.
  const list = await page.locator('[role="list"][aria-label="Assets"]').boundingBox();
  const sheet = await page.locator("#models-sheet").boundingBox();
  if (list === null || sheet === null) throw new Error("no ledger");
  await page.mouse.click((sheet.x + list.x) / 2, list.y + 20);
  expect(await expanded(page)).toEqual([]);
  await expect(bitcoin).toContainText("CAGR 28% \u00B7 Bubble \u00B7 1,000 futures");
  // The setting survives a reload.
  await page.reload();
  await openSheet(page);
  await expect(bitcoin).toContainText("CAGR 28% \u00B7 Bubble \u00B7 1,000 futures");
  await bitcoin.click();
  await expect(page.locator("#v2-variable")).toHaveValue("28");
});

test("§1M: the tick box never expands the row; OFF shows the empty frame and its caption", async ({
  page,
}) => {
  await fresh(page);
  const tick = page
    .getByRole("checkbox", { name: "Show Bitcoin on chart" })
    .or(page.getByRole("switch", { name: "Show Bitcoin on chart" }));
  await tick.click();
  expect(await expanded(page)).toEqual([]);
  await expect(page.locator('[data-layer="front"]')).toHaveAttribute(
    "aria-label",
    "Turn a model on to see it here.",
  );
  await tick.click();
  await expect(page.locator('[data-layer="front"]')).not.toHaveAttribute(
    "aria-label",
    "Turn a model on to see it here.",
  );
});
