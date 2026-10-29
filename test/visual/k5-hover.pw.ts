import { existsSync } from "node:fs";

import { expect, type Locator, type Page, test, type TestInfo } from "@playwright/test";

import { focusRule, gotoStory } from "./checks";

// V32-BUILD K5 (:864): on a fine pointer, hover draws a second outline in the mark's own colour
// (currentColor) with a gap, and no core change; focus (--focus-w --focus) sits outside it;
// disabled parents get none. Default size: the Clamp tick and the asset key. Chromium at 390 and
// 1440, dark and linen.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    browserName !== "chromium" ||
      !["chromium-390x844", "chromium-1440x900"].includes(info.project.name),
    "K5 hover runs in Chromium at 390 and 1440",
  );
});

/** The CheckMark inside a parent (the only aria-hidden span). */
const markOf = (parent: Locator): Locator => parent.locator('span[aria-hidden="true"]').first();

type Ring = { style: string; width: string; offset: string; colour: string; ink: string };

const ringOf = async (mark: Locator): Promise<Ring> =>
  mark.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      style: cs.outlineStyle,
      width: cs.outlineWidth,
      offset: cs.outlineOffset,
      colour: cs.outlineColor,
      ink: cs.borderTopColor,
    };
  });

/** A baseline of the mark and the room its hover and focus rings need. */
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
  const pad = 12;
  await expect(page).toHaveScreenshot(file, {
    clip: {
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + 2 * pad,
      height: box.height + 2 * pad,
    },
  });
};

const set = async (control: Locator, attr: string, on: boolean): Promise<void> => {
  if ((await control.getAttribute(attr)) !== String(on)) await control.click();
};

for (const theme of ["dark", "linen"] as const) {
  test(`K5 hover (${theme}): the tick and the key ring in their own colour; focus outside`, async ({
    page,
  }, info) => {
    await gotoStory(page, "models-sheet/default", { theme });
    const tick = page.getByRole("switch", { name: "Clamp maximum price" });
    const key = page.getByRole("listitem").first().locator("button[aria-pressed]");
    for (const [name, control, attr] of [
      ["tick", tick, "aria-checked"],
      ["key", key, "aria-pressed"],
    ] as const) {
      const mark = markOf(control);
      await control.scrollIntoViewIfNeeded();
      for (const on of [false, true]) {
        await set(control, attr, on);
        await page.evaluate(() => {
          (document.activeElement as HTMLElement | null)?.blur();
        });
        await page.mouse.move(0, 0);
        expect((await ringOf(mark)).style).toBe("none");
        await mark.hover();
        const ring = await ringOf(mark);
        expect([ring.style, ring.width, ring.offset, ring.colour]).toEqual([
          "solid",
          "1px",
          "2px",
          ring.ink,
        ]);
        await shoot(page, info, mark, `k5--${name}-hover${on ? "-on" : ""}--${theme}.png`);
      }
    }
    // Focus and hover together on the key (K5 amended, :864): the 2px --focus ring one more gap past
    // the hover ring, 2 + 1 + 2 = 5px from the mark, 25px overall; it stays put when hover shows.
    await page.keyboard.press("Tab");
    await key.focus();
    const wrap = markOf(key).locator("xpath=..");
    const focus = await wrap.evaluate((el) => {
      const cs = getComputedStyle(el);
      return [cs.outlineStyle, cs.outlineWidth, cs.outlineOffset];
    });
    expect(focus).toEqual(["solid", "2px", "5px"]);
    expect(await focusRule(markOf(key))).toEqual({ focus: 5, rule: 5, overall: 25 });
    await markOf(key).hover();
    expect(await focusRule(markOf(key))).toEqual({ focus: 5, rule: 5, overall: 25 });
    await shoot(page, info, markOf(key), `k5--key-focus-hover--${theme}.png`);
  });
}

test("K5 amended: at 200% text (32px root) the key's focus ring still sits one gap past hover", async ({
  page,
}) => {
  await gotoStory(page, "models-sheet/default", { text200: true });
  const key = page.getByRole("listitem").first().locator("button[aria-pressed]");
  await key.scrollIntoViewIfNeeded();
  await page.keyboard.press("Tab");
  await key.focus();
  // 22px box, 4px gap, 1px stroke: 4 + 1 + 4 = 9px, 22 + 2 * (9 + 2) = 44px.
  expect(await focusRule(markOf(key))).toEqual({ focus: 9, rule: 9, overall: 44 });
});

test("K5: disabled parents get no hover ring (a disabled tick, an inert key)", async ({ page }) => {
  await gotoStory(page, "tick-row/disabled");
  const tick = page.getByRole("switch").first();
  await markOf(tick).hover({ force: true });
  expect((await ringOf(markOf(tick))).style).toBe("none");
  await gotoStory(page, "models-sheet/default");
  const inert = page.locator('button[aria-pressed][aria-disabled="true"]').first();
  await inert.scrollIntoViewIfNeeded();
  await markOf(inert).hover();
  expect((await ringOf(markOf(inert))).style).toBe("none");
});
