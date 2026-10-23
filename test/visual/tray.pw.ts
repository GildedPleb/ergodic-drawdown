import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

import { gotoStory } from "./checks";
import { FIELD_THEMES, FIELD_VIEWPORTS } from "./stories";

// V32-BUILD §1N tray + §1P live fields + §1Q focus-range slider.
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

const committed = (page: Page): Promise<string> => page.locator("#v2-variable").inputValue();

for (const theme of FIELD_THEMES) {
  test(`CAGR tray hangs under its Select with no gap (${theme})`, async ({ page }) => {
    await gotoStory(page, "models-sheet/cagr", { theme });
    const combo = page.locator("#v2-model");
    const tray = page.locator("#v2-model-tray");
    await expect(tray).toHaveAttribute("role", "group");
    await expect(tray).toHaveAttribute("aria-label", "CAGR settings");
    await expect(combo).toHaveAttribute("aria-controls", /v2-model-tray/);
    const c = await box(combo);
    const t = await box(tray);
    expect(Math.abs(t.y - (c.y + c.h))).toBeLessThan(1);
    const rule = await tray.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.borderLeftWidth, s.borderLeftStyle, s.paddingLeft];
    });
    expect(rule).toEqual(["1px", "solid", "16px"]);
  });

  test(`1P: one drag on a cold page changes R (%); the row never changes height (${theme})`, async ({
    page,
  }) => {
    await gotoStory(page, "models-sheet/cagr", { theme });
    const row = page.locator("#row-variable");
    const before = await box(row);
    const slider = page.locator("#row-variable [role=slider]");
    await expect(slider).toBeVisible(); // no click needed to reveal it
    const track = await box(page.locator("#row-variable [role=slider]").locator(".."));
    // Drag to 40% of the track: inside the focus range, 0.4 / 0.8 × 50 = 25.
    await page.mouse.move(track.x + track.w * 0.1, track.y + track.h / 2);
    await page.mouse.down();
    await page.mouse.move(track.x + track.w * 0.4, track.y + track.h / 2, { steps: 6 });
    await expect(slider).toHaveAttribute("aria-valuenow", "25");
    await page.mouse.up();
    await expect(page.locator("#v2-variable")).toHaveValue("25");
    await expect(slider).toHaveAttribute("aria-valuetext", "25 percent");
    // Focusing the value cell doesn't change the row's height; the underline turns --accent.
    await page.locator("#v2-variable").focus();
    const after = await box(row);
    expect(Math.abs(after.h - before.h)).toBeLessThan(0.5);
  });

  test(`1P: one click selects the whole value, so typing replaces it (${theme})`, async ({
    page,
  }) => {
    await gotoStory(page, "models-sheet/cagr", { theme });
    const input = page.locator("#v2-variable");
    await input.click();
    const sel = await input.evaluate((el: HTMLInputElement) => [
      el.selectionStart,
      el.selectionEnd,
      el.value.length,
    ]);
    expect(sel).toEqual([0, 2, 2]);
    await page.keyboard.type("5000");
    await page.keyboard.press("Enter");
    // §1Q: kept (no clamp above), the thumb pins at the right end.
    expect(await committed(page)).toBe("5000");
    const slider = page.locator("#row-variable [role=slider]");
    await expect(slider).toHaveAttribute("aria-valuenow", "5000");
    const s = await box(slider);
    const track = await box(slider.locator(".."));
    expect(Math.abs(s.x + s.w / 2 - (track.x + track.w))).toBeLessThan(2);
  });

  test(`1Q: arrows step 1 inside the focus range; below 0 clamps with a message in the tray (${theme})`, async ({
    page,
  }) => {
    await gotoStory(page, "models-sheet/cagr", { theme });
    const slider = page.locator("#row-variable [role=slider]");
    await slider.focus();
    await page.keyboard.press("ArrowUp");
    await expect(slider).toHaveAttribute("aria-valuenow", "21");
    await expect(slider).toHaveAttribute("aria-valuetext", "21 percent");
    const input = page.locator("#v2-variable");
    await input.click();
    await page.keyboard.type("-5");
    await page.keyboard.press("Enter");
    const msg = page.locator("#v2-variable-message");
    await expect(msg).toHaveText("Min is 0");
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
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press("Tab");
      order.push(
        await page.evaluate(() => {
          const a = document.activeElement;
          return a?.id !== "" && a?.id !== undefined ? a.id : (a?.getAttribute("role") ?? "");
        }),
      );
    }
    expect(order).toEqual(["v2-variable", "slider", "v2-minmax", "v2-walk"]);
    await page.locator("#v2-model").click();
    await page.getByRole("option", { name: "Power Law Regression Median" }).click();
    await expect(page.locator("#v2-model-tray")).toHaveCount(0);
    expect(await new AxeBuilder({ page }).analyze().then((r) => r.violations.length)).toBe(0);
  });
}
