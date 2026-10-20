import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

import { gotoStory } from "./checks";
import { FIELD_THEMES, FIELD_VIEWPORTS } from "./stories";

// V32-BUILD §1N: a Select's dependent fields hang in its tray, and a value cell edits in place:
// no second box, no duplicate value, the row's line keeps its height and its background.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    !FIELD_VIEWPORTS.some((v) => info.project.name === `${browserName}-${v}`),
    "tray checks run at 390x844 and 1440x900",
  );
});

const box = async (l: Locator): Promise<{ x: number; y: number; w: number; h: number }> => {
  const b = await l.boundingBox();
  if (b === null) throw new Error("not laid out");
  return { x: b.x, y: b.y, w: b.width, h: b.height };
};

const bg = (page: Page, sel: string): Promise<string> =>
  page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundColor);

for (const theme of FIELD_THEMES) {
  test(`CAGR tray hangs under its Select; editing keeps the row line (${theme})`, async ({
    page,
  }) => {
    await gotoStory(page, "models-sheet/cagr", { theme });
    const combo = page.locator("#v2-model");
    const tray = page.locator("#v2-model-tray");
    await expect(tray).toHaveAttribute("role", "group");
    await expect(tray).toHaveAttribute("aria-label", "CAGR settings");
    await expect(combo).toHaveAttribute("aria-controls", /v2-model-tray/);
    // No gap: the tray starts where the Select's frame ends, and is indented by its rule.
    const c = await box(combo);
    const t = await box(tray);
    expect(Math.abs(t.y - (c.y + c.h))).toBeLessThan(1);
    const rule = await tray.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.borderLeftWidth, s.borderLeftStyle, s.paddingLeft];
    });
    expect(rule).toEqual(["1px", "solid", "16px"]);

    const closedRow = await box(page.locator("#row-variable"));
    const closedLabel = await box(page.locator("#row-variable > span").first());
    const closedBg = await bg(page, "#row-variable");
    await page.locator("#row-variable").click();
    const input = page.locator("#v2-variable");
    await expect(input).toBeFocused();
    const editor = page.locator("#row-variable-editor");
    const label = await box(editor.locator("> span").first());
    const field = await box(input);
    // The label doesn't move; the input sits inside the closed row's line.
    expect(Math.abs(label.y - closedLabel.y)).toBeLessThan(1);
    expect(Math.abs(label.x - closedLabel.x)).toBeLessThan(1);
    expect(field.y >= closedRow.y - 0.5).toBe(true);
    expect(field.y + field.h <= closedRow.y + closedRow.h + 0.5).toBe(true);
    expect(await bg(page, "#row-variable-editor")).toBe(closedBg);
    // No second box: one underline in --accent, no other border, no fill.
    const face = await input.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        top: s.borderTopWidth,
        left: s.borderLeftWidth,
        bottom: s.borderBottomWidth,
        fill: s.backgroundColor,
      };
    });
    expect(face).toEqual({ top: "0px", left: "0px", bottom: "1px", fill: "rgba(0, 0, 0, 0)" });
    // No duplicate value: the closed value cell is gone, the input carries the number.
    await expect(editor.getByText("20", { exact: true })).toHaveCount(0);
    await expect(input).toHaveValue("20");
  });

  test(`a field with no slider keeps its whole row height while editing (${theme})`, async ({
    page,
  }) => {
    await gotoStory(page, "models-sheet/default", { theme });
    const closed = await box(page.locator("#row-samples"));
    await page.locator("#row-samples").click();
    await expect(page.locator("#v2-samples")).toBeFocused();
    const open = await box(page.locator("#row-samples-editor"));
    expect(Math.abs(open.h - closed.h)).toBeLessThan(0.5);
    expect(Math.abs(open.y - closed.y)).toBeLessThan(0.5);
    // Esc puts the value cell back and focus on it.
    await page.keyboard.press("Escape");
    await expect(page.locator("#row-samples")).toBeFocused();
  });

  test(`a clamp message sits under the row, inside the tray (${theme})`, async ({ page }) => {
    await gotoStory(page, "models-sheet/cagr", { theme });
    await page.locator("#row-variable").click();
    const input = page.locator("#v2-variable");
    await input.fill("5000");
    await input.press("Enter");
    const msg = page.locator("#v2-variable-message");
    await expect(msg).toHaveText("R (%) goes from 0 to 1,000. We used 1,000.");
    const m = await box(msg);
    const t = await box(page.locator("#v2-model-tray"));
    expect(m.y >= t.y && m.y + m.h <= t.y + t.h + 0.5).toBe(true);
  });

  test(`Tab order is Select, tray fields, next Select; no fields means no tray (${theme})`, async ({
    page,
  }) => {
    await gotoStory(page, "models-sheet/cagr", { theme });
    await page.locator("#v2-model").focus();
    const order: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press("Tab");
      order.push(await page.evaluate(() => document.activeElement?.id ?? ""));
    }
    expect(order).toEqual(["row-variable", "row-minmax", "v2-walk"]);
    // Power Law: no fields, so no tray at all.
    await page.locator("#v2-model").click();
    await page.getByRole("option", { name: "Power Law Regression Median" }).click();
    await expect(page.locator("#v2-model-tray")).toHaveCount(0);
    expect(await new AxeBuilder({ page }).analyze().then((r) => r.violations.length)).toBe(0);
  });
}
