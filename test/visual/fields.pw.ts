import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";

import {
  expectAxeClean,
  expectNoOverflow,
  expectOnlySmFonts,
  expectTapTargets,
  gotoStory,
} from "./checks";
import { FIELD_STORIES, FIELD_THEMES, FIELD_VIEWPORTS } from "./stories";

// Select + NumberField: Default, Focus, Invalid, EmojiLabel × dark/linen × 390×844 and 1440×900.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    !FIELD_VIEWPORTS.some((v) => info.project.name === `${browserName}-${v}`),
    "field matrix runs at 390x844 and 1440x900",
  );
});

for (const id of FIELD_STORIES) {
  for (const theme of FIELD_THEMES) {
    test(`${id} (${theme}): axe, tap targets, overflow, fonts, screenshot`, async ({
      page,
      browserName,
    }, info) => {
      await gotoStory(page, id, { theme });
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const control = id.startsWith("select/")
        ? page.getByRole("combobox")
        : page.getByRole("spinbutton");
      if (id.endsWith("/focus")) {
        await page.keyboard.press("Tab");
        await expect(control).toBeFocused();
      }
      if (id.endsWith("/invalid")) {
        await expect(control).toHaveAttribute("aria-invalid", "true");
        const describedBy = (await control.getAttribute("aria-describedby")) ?? "";
        const message = page.locator(`[id="${describedBy}"]`);
        await expect(message).toBeVisible();
        await expect(message.locator("svg")).toHaveCount(1); // the ⚠ icon
        await expect(message).toContainText(/\. (Enter|Pick)/); // cause, then the next step
      }
      if (id === "select/emoji-label") {
        // Exact string in the native value; the closed face draws 4 SVG circles (no emoji font).
        await expect(control).toHaveValue("🟢🟢🟢🔴");
        await expect(page.locator("svg circle")).toHaveCount(4);
      }
      if (id === "number-field/emoji-label") {
        await expect(page.getByRole("img", { name: "🟢🟢🟢🔴 volatility:" })).toBeVisible();
        await expect(control).toHaveAccessibleName("🟢🟢🟢🔴 volatility:");
      }
      await expectAxeClean(page);
      await expectTapTargets(page);
      await expectNoOverflow(page);
      if (browserName === "chromium") await expectOnlySmFonts(page);

      const name = `${id.replace("/", "--")}--${theme}.png`;
      if (!existsSync(info.snapshotPath(name))) {
        info.annotations.push({
          type: "baseline-pending",
          description: `${info.project.name}/${name}`,
        });
        if (process.env["VISUAL_UPDATE"] !== "1") return;
      }
      await expect(page).toHaveScreenshot(name, { fullPage: true });
    });
  }
}
