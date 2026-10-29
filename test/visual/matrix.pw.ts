import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";

import {
  expectAxeClean,
  expectNoOverflow,
  expectOnlySmFonts,
  expectTapTargets,
  gotoStory,
} from "./checks";
import { TICK_ROW_STORIES, ZOOM_STORIES } from "./stories";

for (const id of TICK_ROW_STORIES) {
  test(`${id}: axe, tap targets, overflow, fonts, screenshot`, async ({
    page,
    browserName,
  }, info) => {
    await gotoStory(page, id, { text200: info.project.name === "chromium-text200" });
    if (id.endsWith("/focus")) {
      await page.keyboard.press("Tab");
      await expect(page.getByRole("switch")).toBeFocused();
    }
    await expectAxeClean(page);
    await expectTapTargets(page);
    await expectNoOverflow(page);
    if (browserName === "chromium") await expectOnlySmFonts(page);

    const name = `${id.replace("/", "--")}.png`;
    if (!existsSync(info.snapshotPath(name))) {
      // No approved baseline for this project yet (see README): report it instead of minting one.
      info.annotations.push({
        type: "baseline-pending",
        description: `${info.project.name}/${name}`,
      });
      if (process.env["VISUAL_UPDATE"] !== "1") return;
    }
    await expect(page).toHaveScreenshot(name, { fullPage: true });
  });
}

// Form N2: the Models pane at 200% zoom (720×450 CSS px) and 200% OS text, plus the 390 @ 200%
// case (195×422): labels stack above fields, words stay whole, nothing scrolls sideways.
for (const id of ZOOM_STORIES) {
  test(`${id}: reflow at 200% zoom / text (axe, tap targets, overflow)`, async ({ page }, info) => {
    test.skip(
      !["chromium-zoom200", "chromium-text200"].includes(info.project.name),
      "zoom and OS-text projects only",
    );
    await gotoStory(page, id, { text200: info.project.name === "chromium-text200" });
    await expectAxeClean(page);
    await expectTapTargets(page);
    await expectNoOverflow(page);
  });

  test(`${id}: at 195 CSS px wide nothing scrolls sideways and labels keep whole words`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "chromium-zoom200", "the 390 @ 200% case runs once");
    await page.setViewportSize({ width: 195, height: 422 });
    await gotoStory(page, id);
    await expectNoOverflow(page);
    // Stacked: each label is as wide as its field, so no label is a one-letter column.
    for (const id of ["v2-vol", "v2-samples", "v2-years"]) {
      const box = await page.locator(`label[for="${id}"]:not([data-target])`).boundingBox();
      expect(box?.width ?? 0, id).toBeGreaterThanOrEqual(100);
    }
  });
}
