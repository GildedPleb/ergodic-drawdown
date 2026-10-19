import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";

import {
  expectAxeClean,
  expectNoOverflow,
  expectOnlySmFonts,
  expectTapTargets,
  gotoStory,
} from "./checks";
import { TICK_ROW_STORIES } from "./stories";

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
