import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";

import {
  expectAxeClean,
  expectNoEmojiText,
  expectNoOverflow,
  expectOnlySmFonts,
  expectTapTargets,
  gotoStory,
} from "./checks";
import { FIELD_STORIES, FIELD_THEMES, FIELD_VIEWPORTS } from "./stories";

// Form B1: every field / glyph / amount / section-label story and the models pane, both themes,
// 390×844 and 1440×900, Chromium and WebKit. `…/linen` stories force linen, so they run once.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    !FIELD_VIEWPORTS.some((v) => info.project.name === `${browserName}-${v}`),
    "field matrix runs at 390x844 and 1440x900",
  );
});

for (const id of FIELD_STORIES) {
  for (const theme of FIELD_THEMES) {
    if (id.endsWith("/linen") && theme === "dark") continue;
    test(`${id} (${theme}): axe, tap targets, overflow, fonts, emoji, screenshot`, async ({
      page,
      browserName,
    }, info) => {
      await gotoStory(page, id, { theme });
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      // Form nit: one h1 per story page.
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const control = id.startsWith("tick-row/")
        ? page.getByRole("switch")
        : id.startsWith("select/")
          ? page.getByRole("combobox")
          : page.getByRole("spinbutton");
      if (id.endsWith("/focus") || id === "select/open") {
        await page.keyboard.press("Tab");
        await expect(control).toBeFocused();
      }
      if (id === "select/hover") await control.hover();
      if (id === "select/open") {
        // 1L.3: APG select-only combobox; ↓ opens on the value, axe then checks the open listbox.
        await page.keyboard.press("ArrowDown");
        await expect(control).toHaveAttribute("aria-expanded", "true");
        await expect(page.getByRole("listbox")).toBeVisible();
        await expect(control).toHaveAttribute("aria-activedescendant", "story-select-opt-3");
      }
      if (id.endsWith("/invalid")) {
        await expect(control).toHaveAttribute("aria-invalid", "true");
        const describedBy = (await control.getAttribute("aria-describedby")) ?? "";
        const message = page.locator(`[id="${describedBy.split(" ").at(-1) ?? ""}"]`);
        await expect(message).toBeVisible();
        await expect(message.locator("svg")).toHaveCount(1); // the ⚠ icon
        await expect(message).toContainText(/\. (Enter|Pick)/); // cause, then the next step
      }
      if (id.endsWith("/disabled")) await expect(control).toBeDisabled();
      if (id === "number-field/emoji-label") {
        await expect(page.getByRole("img", { name: "3 up, 1 down, volatility:" })).toBeVisible();
        await expect(control).toHaveAccessibleName("🟢🟢🟢🔴 volatility:");
      }
      if (id === "models-sheet/emoji-walk") {
        // B2: the engine's emoji walk selected; SVG circles, spoken name, no emoji text node.
        const walk = page.locator("#v2-walk");
        await expect(walk.getByRole("img", { name: "3 up, 1 down" })).toBeVisible();
        await expect(walk.locator("svg circle")).toHaveCount(4);
      }
      await expectNoEmojiText(page);
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
