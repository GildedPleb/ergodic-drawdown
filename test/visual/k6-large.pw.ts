import { existsSync } from "node:fs";

import { expect, type Locator, type Page, test, type TestInfo } from "@playwright/test";

import { focusRule, gotoStory } from "./checks";

// V32-BUILD K6 (:866), Large A: the Swatches mark is a 20px box, 2px stroke, 3px gap, 10px core.
// Hover is the stroke again (2px, currentColor) a gap out; focus is --focus-w --focus a gap past
// that, 40px across, inside the 44px target. Disabled states (CheckMark stories) are dashed with no
// hover ring. Chromium at 390 and 1440, dark and linen.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    browserName !== "chromium" ||
      !["chromium-390x844", "chromium-1440x900"].includes(info.project.name),
    "K6 large runs in Chromium at 390 and 1440",
  );
});

/** The CheckMark inside a parent (the only aria-hidden span). */
const markOf = (parent: Locator): Locator => parent.locator('span[aria-hidden="true"]').first();

type Box = { style: string; width: string; offset: string; colour: string; ink: string };

const outlineOf = async (el: Locator): Promise<Box> =>
  el.evaluate((node) => {
    const cs = getComputedStyle(node);
    return {
      style: cs.outlineStyle,
      width: cs.outlineWidth,
      offset: cs.outlineOffset,
      colour: cs.outlineColor,
      ink: cs.borderTopColor,
    };
  });

/** The mark's box, stroke width and style, and core (the content box, filled when on) in CSS px. */
const shapeOf = async (mark: Locator): Promise<[number, string, string, number]> =>
  mark.evaluate((node) => {
    const cs = getComputedStyle(node);
    const px = (v: string): number => Number.parseFloat(v);
    const size = node.getBoundingClientRect().width;
    const core = size - 2 * (px(cs.borderTopWidth) + px(cs.paddingTop));
    return [size, cs.borderTopWidth, cs.borderTopStyle, core];
  });

/** A 44px baseline centred on the mark: the whole target, so the 40px focus ring fits. */
const shoot = async (page: Page, info: TestInfo, mark: Locator, file: string): Promise<void> => {
  if (!existsSync(info.snapshotPath(file))) {
    info.annotations.push({
      type: "baseline-pending",
      description: `${info.project.name}/${file}`,
    });
    if (process.env["VISUAL_UPDATE"] !== "1") return;
  }
  const box = await mark.boundingBox();
  if (box === null) throw new Error(`no mark for ${file}`);
  const half = 22;
  await expect(page).toHaveScreenshot(file, {
    clip: {
      x: box.x + box.width / 2 - half,
      y: box.y + box.height / 2 - half,
      width: 2 * half,
      height: 2 * half,
    },
  });
};

for (const theme of ["dark", "linen"] as const) {
  test(`K6 large (${theme}): a swatch off, on, hovered, focused; 20/2/3/10, rings 40px across`, async ({
    page,
  }, info) => {
    await gotoStory(page, "models-sheet/default", { theme });
    const chips = page.locator('[role="radiogroup"] [role="radio"]');
    const on = chips.locator('xpath=self::*[@aria-checked="true"]').first();
    const off = chips.locator('xpath=self::*[@aria-checked="false"]').first();
    await on.scrollIntoViewIfNeeded();
    for (const [name, chip] of [
      ["off", off],
      ["on", on],
    ] as const) {
      const mark = markOf(chip);
      await page.mouse.move(0, 0);
      const [size, line, dash, core] = await shapeOf(mark);
      expect([size, line, dash]).toEqual([20, "2px", "solid"]);
      expect(core).toBe(10);
      expect((await outlineOf(mark)).style).toBe("none");
      await shoot(page, info, mark, `k6--swatch-${name}--${theme}.png`);
      await mark.hover();
      const ring = await outlineOf(mark);
      expect([ring.style, ring.width, ring.offset, ring.colour]).toEqual([
        "solid",
        "2px",
        "3px",
        ring.ink,
      ]);
      await shoot(page, info, mark, `k6--swatch-hover${name === "on" ? "-on" : ""}--${theme}.png`);
    }
    // Focus on the picked chip: --focus-w at --s-2 on the wrapper, a 3px gap past the hover ring.
    await page.mouse.move(0, 0);
    await page.keyboard.press("Tab");
    await on.focus();
    const wrap = markOf(on).locator("xpath=..");
    const focus = await outlineOf(wrap);
    expect([focus.style, focus.width, focus.offset]).toEqual(["solid", "2px", "8px"]);
    // 20 + 2 * (3 + 2 + 3 + 2) = 40, inside the 44px target.
    const across = 20 + 2 * (Number.parseFloat(focus.offset) + Number.parseFloat(focus.width));
    expect(across).toBe(40);
    await shoot(page, info, markOf(on), `k6--swatch-focus-on--${theme}.png`);
    expect(await focusRule(markOf(on))).toEqual({ focus: 8, rule: 8, overall: 40 });
    await markOf(on).hover();
    // K5 amended: focus never moves when hover shows.
    expect(await focusRule(markOf(on))).toEqual({ focus: 8, rule: 8, overall: 40 });
    await shoot(page, info, markOf(on), `k6--swatch-focus-hover--${theme}.png`);
  });

  test(`K6 large (${theme}): at 200% text (32px root) focus still sits one gap past hover`, async ({
    page,
  }) => {
    await gotoStory(page, "models-sheet/default", { text200: true, theme });
    const on = page.locator('[role="radiogroup"] [role="radio"][aria-checked="true"]').first();
    await on.scrollIntoViewIfNeeded();
    await page.keyboard.press("Tab");
    await on.focus();
    // 40px box, 3px gap, 2px stroke: 3 + 2 + 3 = 8px, 40 + 2 * (8 + 2) = 60px.
    expect(await focusRule(markOf(on))).toEqual({ focus: 8, rule: 8, overall: 60 });
  });

  test(`K6 large (${theme}): disabled and disabled-on are dashed, with no hover ring`, async ({
    page,
  }, info) => {
    for (const id of ["large-disabled", "large-disabled-on"] as const) {
      await gotoStory(page, `check-mark/${id}`, { theme });
      const mark = page.locator('main span[aria-hidden="true"]').first();
      // Drawn in --disabled, as a disabled parent sets it (the story alone inherits the text colour).
      await mark.evaluate((el) => {
        (el as HTMLElement).style.color = "var(--disabled)";
      });
      const [size, line, dash, core] = await shapeOf(mark);
      expect([size, line, dash]).toEqual([20, "2px", "dashed"]);
      if (id === "large-disabled-on") expect(core).toBe(10);
      await mark.hover();
      expect((await outlineOf(mark)).style).toBe("none");
      await shoot(page, info, mark, `k6--${id}--${theme}.png`);
    }
  });
}
